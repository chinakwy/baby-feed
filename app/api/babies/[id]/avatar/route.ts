import { familyDataOwner, canManageFamily } from '@/lib/family-access'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { noStoreHeaders } from '@/lib/api-helpers'
import { validateSameOrigin } from '@/lib/validation'
import { normalizeAvatar, readAvatarBody } from '@/lib/avatar'
import { buildUserActionKey, enforceRateLimit } from '@/lib/rate-limit'
import { logError } from '@/lib/logger'
export const runtime = 'nodejs'
async function handle(request:NextRequest, context:{params:Promise<{id:string}>}, save:boolean) {
  try {
    const session=await auth(request)
    if(!session?.user?.id) return NextResponse.json({error:'未授权'},{status:401,headers:noStoreHeaders})
    if(save && !canManageFamily(session.user)) return NextResponse.json({error:'此账号不能修改宝宝资料'},{status:403,headers:noStoreHeaders})
    if(save && !validateSameOrigin(request).valid) return NextResponse.json({error:'来源不允许'},{status:403,headers:noStoreHeaders})
    const limit=enforceRateLimit({key:buildUserActionKey(save?'avatar-save':'avatar-read',familyDataOwner(session.user),request),limit:save?20:120,windowMs:60000})
    if(!limit.allowed) return NextResponse.json({error:'操作过于频繁，请稍后重试'},{status:429,headers:noStoreHeaders})
    const {id}=await context.params
    const baby=await prisma.baby.findFirst({where:{id,createdBy:familyDataOwner(session.user)},select:{avatarImage:true,updatedAt:true}})
    if(!baby) return NextResponse.json({error:'宝宝不存在'},{status:404,headers:noStoreHeaders})
    if(!save) return NextResponse.json({image:baby.avatarImage,version:baby.updatedAt.toISOString()},{headers:noStoreHeaders})
    let body,image:string
    try { body=await readAvatarBody(request);image=await normalizeAvatar(body.image) }
    catch { return NextResponse.json({error:'照片格式不支持或图片过大，请选择较小的 JPG/PNG 照片'},{status:400,headers:noStoreHeaders}) }
    if(body.version!==baby.updatedAt.toISOString()) return NextResponse.json({error:'宝宝信息已更新，请关闭后重新打开头像再试'},{status:409,headers:noStoreHeaders})
    const updatedAt=new Date(Math.max(Date.now(),baby.updatedAt.getTime()+1))
    const changed=await prisma.baby.updateMany({where:{id,createdBy:familyDataOwner(session.user),updatedAt:baby.updatedAt},data:{avatarImage:image,updatedAt}})
    if(changed.count!==1) return NextResponse.json({error:'宝宝信息已更新，请重新打开头像再试'},{status:409,headers:noStoreHeaders})
    return NextResponse.json({image,version:updatedAt.toISOString()},{headers:noStoreHeaders})
  } catch(error) { logError('头像操作失败',error);return NextResponse.json({error:'头像操作失败，请重试'},{status:500,headers:noStoreHeaders}) }
}
export const GET=(request:NextRequest,context:{params:Promise<{id:string}>})=>handle(request,context,false)
export const PUT=(request:NextRequest,context:{params:Promise<{id:string}>})=>handle(request,context,true)
