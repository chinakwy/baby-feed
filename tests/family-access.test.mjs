import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import {NextRequest} from 'next/server.js'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import load from './helpers/load-component.cjs'
const {familyDataOwner,canManageFamily}=load('lib/family-access.ts')
let actor={id:'recorder',familyRole:'RECORDER'},queries=[]
const original=Module._load
Module._load=function(name,...args){
 if(name==='@/lib/auth')return {auth:async()=>({user:actor})}
 if(name==='@/lib/prisma')return {prisma:{baby:{findMany:async args=>{queries.push(args);return [{id:'shared-baby'}]}}}}
 if(name==='@/lib/rate-limit')return {buildUserActionKey:()=>'',enforceRateLimit:()=>({allowed:true})}
 if(name==='@/lib/rate-limit-config')return {getRateLimit:()=>({limit:10,windowMs:60000})}
 if(name==='next/cache')return {revalidatePath(){}}
 if(name==='next/navigation')return {useRouter:()=>({push(){},refresh(){}})}
 if(name==='@/components/CopyToast')return {useCopyToast:()=>({copyToClipboard(){}})}
 return original.call(this,name,...args)
}
const babies=load('app/api/babies/route.ts'),baby=load('app/api/babies/[id]/route.ts'),account=load('app/api/user/delete/route.ts'),avatar=load('app/api/babies/[id]/avatar/route.ts'),Settings=load('components/Settings.tsx').default
Module._load=original
const req=(method,path)=>new NextRequest('http://localhost:3000'+path,{method})
test('data scope keeps actor identity distinct and defaults independent accounts to their own data',()=>{
 assert.equal(familyDataOwner({id:'manager',familyOwnerId:'recorder'}),'recorder')
 assert.equal(familyDataOwner({id:'stranger'}),'stranger')
 assert.equal(canManageFamily({id:'x',familyRole:'RECORDER'}),false)
 assert.equal(canManageFamily({id:'x',familyRole:'UNKNOWN'}),false)
 assert.equal(canManageFamily({id:'x',familyRole:'OWNER'}),true)
})
test('recorder cannot bypass hidden settings via direct baby/avatar/account write endpoints',async()=>{
 actor={id:'recorder',familyRole:'RECORDER'}
 for(const [route,method,path] of [[babies,'POST','/api/babies'],[baby,'PUT','/api/babies/shared-baby'],[baby,'DELETE','/api/babies/shared-baby'],[account,'DELETE','/api/user/delete'],[avatar,'PUT','/api/babies/shared-baby/avatar']]) {
  const response=await route[method](req(method,path),{params:Promise.resolve({id:'shared-baby'})});assert.equal(response.status,403,path)
 }
})
test('manager and recorder list shared babies while an unrelated account stays in its own scope',async()=>{
 for(const user of [{id:'recorder',familyRole:'RECORDER'},{id:'manager',familyOwnerId:'recorder',familyRole:'OWNER'},{id:'stranger',familyRole:'OWNER'}]){
  actor=user;await babies.GET(req('GET','/api/babies'));assert.equal(queries.at(-1).where.createdBy,user.familyOwnerId||user.id)
 }
})
test('settings hides both sensitive sections for recorder and renders them for manager',()=>{
 for(const allowed of [false,true]){
  const html=renderToStaticMarkup(React.createElement(Settings,{canManageFamily:allowed,userName:'模拟账号',userEmail:'fixture@example.invalid',currentVersion:'v0.30',initialBabies:[{id:'fixture-baby',name:'模拟宝宝',birthDate:'2026-01-01',gender:'FEMALE',createdAt:'2026-01-01'}]}))
  assert.equal(html.includes('宝宝管理'),allowed);assert.equal(html.includes('账户与数据'),allowed)
 }
})
