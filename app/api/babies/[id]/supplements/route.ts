import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeParseBody, validateId, validateSameOrigin } from '@/lib/validation'
import { readSupplementSettings, validateSupplementDefinitions } from '@/lib/supplements'
import { noStoreHeaders } from '@/lib/api-helpers'
import { buildUserActionKey, enforceRateLimit } from '@/lib/rate-limit'
import { getRateLimit } from '@/lib/rate-limit-config'
const response = (body: unknown, status = 200) => NextResponse.json(body, {status,headers:noStoreHeaders})
type Context = {params:Promise<{id:string}>}
export async function GET(request:NextRequest,context:Context) {
  try {
    const session=await auth(request)
    if(!session?.user) return response({error:'未授权'},401)
    const {id}=await context.params
    if(!validateId(id).valid) return response({error:'宝宝标识无效'},400)
    const baby=await prisma.baby.findFirst({where:{id,createdBy:session.user.id},select:{supplementSettings:true,updatedAt:true}})
    if(!baby) return response({error:'宝宝不存在'},404)
    return response({definitions:readSupplementSettings(baby.supplementSettings),version:baby.updatedAt.toISOString()})
  } catch {return response({error:'读取失败'},500)}
}
export async function PUT(request:NextRequest,context:Context) {
  try {
    const session=await auth(request)
    if(!session?.user) return response({error:'未授权'},401)
    if(!validateSameOrigin(request).valid) return response({error:'请求来源无效'},403)
    const limit=enforceRateLimit({key:buildUserActionKey('supplements-update',session.user.id,request),...getRateLimit('health-create')})
    if(!limit.allowed) return response({error:'操作过于频繁，请稍后再试'},429)
    const {id}=await context.params
    if(!validateId(id).valid) return response({error:'宝宝标识无效'},400)
    const baby=await prisma.baby.findFirst({where:{id,createdBy:session.user.id},select:{id:true}})
    if(!baby) return response({error:'宝宝不存在'},404)
    const {data,error}=await safeParseBody(request)
    if(error || !data) return response({error:error||'请求格式无效'},400)
    if (typeof data.version !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.version) || Number.isNaN(new Date(data.version).getTime())) return response({error:'请重新加载项目设置后再保存'},400)
    let definitions
    try {definitions=validateSupplementDefinitions(data.definitions)} catch(error) {return response({error:(error as Error).message},400)}
    const version=new Date()
    const updated=await prisma.baby.updateMany({where:{id,createdBy:session.user.id,updatedAt:new Date(data.version)},data:{supplementSettings:JSON.stringify(definitions),updatedAt:version}})
    if(updated.count!==1) return response({error:'项目设置已在其他设备更新，请重新加载后再修改'},409)
    return response({definitions,version:version.toISOString()})
  } catch {return response({error:'保存失败'},500)}
}
