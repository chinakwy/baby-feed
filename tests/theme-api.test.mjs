import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import {NextRequest} from 'next/server.js'
import load from './helpers/load-component.cjs'
let user={id:'fictional-a'},writes=0
const themes=new Map([['fictional-a','pink'],['fictional-b','blue']])
const oldLoad=Module._load
Module._load=function(name,...args){
 if(name==='@/lib/auth')return {auth:async()=>user?{user}:null}
 if(name==='@/lib/prisma')return {prisma:{user:{findUnique:async({where})=>({themeColor:themes.get(where.id)}),update:async({where,data})=>{writes++;themes.set(where.id,data.themeColor);return {themeColor:data.themeColor}}}}}
 if(name==='next/cache')return {revalidatePath(){}}
 if(name==='@/lib/rate-limit')return {buildUserActionKey:()=>'',enforceRateLimit:()=>({allowed:true})}
 if(name==='@/lib/rate-limit-config')return {getRateLimit:()=>({limit:10,windowMs:60000})}
 return oldLoad.call(this,name,...args)
}
let route={}
try{route=load('app/api/user/theme/route.ts')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}finally{Module._load=oldLoad}
const request=(body,origin='http://localhost:3000')=>new NextRequest('http://localhost:3000/api/user/theme',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
test('theme requires login, denies foreign origin and rejects unknown values without saving',async()=>{
 assert.equal(typeof route.PUT,'function')
 writes=0;user=null
 assert.equal((await route.GET(new NextRequest('http://localhost:3000'))).status,401)
 assert.equal((await route.PUT(request({theme:'pink'}))).status,401)
 user={id:'fictional-a'}
 assert.equal((await route.PUT(request({theme:'pink'},'https://foreign.invalid'))).status,403)
 for(const theme of ['red','<script>',null,{},5])assert.equal((await route.PUT(request({theme}))).status,400)
 assert.equal(writes,0)
})
test('theme saves only the current account and can be read by a fresh request',async()=>{
 assert.equal(typeof route.PUT,'function');user={id:'fictional-a'}
 assert.equal((await route.PUT(request({theme:'purple',userId:'fictional-b'}))).status,200)
 assert.equal(themes.get('fictional-b'),'blue')
 assert.deepEqual(await (await route.GET(new NextRequest('http://localhost:3000'))).json(),{theme:'purple'})
})
