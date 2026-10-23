import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
import {NextRequest} from 'next/server.js'
let user={id:'fictional-user'}, owned=true, writes=0, claimed=1
const oldLoad=Module._load
Module._load=function(name,...args){
 if(name==='@/lib/auth')return {auth:async()=>user?{user}:null}
 if(name==='@/lib/prisma')return {prisma:{baby:{findFirst:async({where})=>{assert.equal(where.createdBy,user.id);return owned?{id:'c123456789012345678901234',supplementSettings:null,updatedAt:new Date('2026-10-23T01:00:00Z')}:null},updateMany:async({where})=>{assert.equal(where.createdBy,user.id);writes++;return {count:claimed}}}}}
 if(name==='@/lib/rate-limit')return {buildUserActionKey:()=>'',enforceRateLimit:()=>({allowed:true})}
 if(name==='@/lib/rate-limit-config')return {getRateLimit:()=>({limit:10,windowMs:60000})}
 return oldLoad.call(this,name,...args)
}
const route=load('app/api/babies/[id]/supplements/route.ts')
Module._load=oldLoad
const context={params:Promise.resolve({id:'c123456789012345678901234'})}
const definitions=[{id:'DHA',name:'DHA',unit:'',enabled:true}]
const req=(body,origin='http://localhost:3000')=>new NextRequest('http://localhost:3000/api/babies/c123456789012345678901234/supplements',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
test('catalog enforces owner/auth/origin and malformed input without writes',async()=>{
 writes=0;user=null
 assert.equal((await route.GET(new NextRequest('http://localhost:3000'),context)).status,401)
 user={id:'fictional-user'};owned=false
 assert.equal((await route.PUT(req({definitions}),context)).status,404)
 owned=true
 assert.equal((await route.PUT(req({definitions},'https://other.test'),context)).status,403)
 assert.equal((await route.PUT(req({definitions:[{id:'DHA',name:''}],version:'2026-10-23T01:00:00.000Z'}),context)).status,400)
 assert.equal(writes,0)
})
test('catalog detects stale phone edits using version and returns defaults without dosage',async()=>{
 user={id:'fictional-user'};owned=true;claimed=1
 const get=await route.GET(new NextRequest('http://localhost:3000'),context)
 const data=await get.json()
 assert.equal(data.version,'2026-10-23T01:00:00.000Z')
 assert.equal(data.definitions[2].id,'DHA')
 assert.equal((await route.PUT(req({definitions}),context)).status,400)
 claimed=0
 assert.equal((await route.PUT(req({definitions,version:data.version}),context)).status,409)
 claimed=1
 assert.equal((await route.PUT(req({definitions,version:data.version}),context)).status,200)
})
