import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
const captured=[]
const original=Module._load
Module._load=function(name,...args){
 if(name==='@/app/generated/prisma/client')return {Prisma:{PrismaClientKnownRequestError:class extends Error {}}}
 if(name==='./prisma')return {prisma:{webhookEndpoint:{findMany:async()=>[]},webhookEvent:{create:async({data})=>{captured.push(JSON.parse(data.payload));return {deliveries:[]}}}}}
 if(name==='./webhook-runner')return {attemptWebhookDelivery:()=>assert.fail('No external webhook permitted in this test')}
 return original.call(this,name,...args)
}
const service=load('lib/webhook-service.ts');Module._load=original
const when=new Date('2026-10-23T00:00:00Z')
const baby={id:'baby',name:'虚构宝宝',birthDate:when,gender:'FEMALE'}
const entry=amount=>JSON.stringify([{id:'DHA',name:'虚构补充',amount,unit:'份'}])
test('nutrition webhook retains snapshot detail and detects dose-only edits without sending notifications',async()=>{
 const record={id:'health',babyId:'baby',type:'AD_VITAMIN',recordedAt:when,createdAt:when,updatedAt:when,supplements:entry('1')}
 await service.emitHealthCreated('fictional-user',record,baby)
 assert.equal(captured.at(-1).data.supplements,record.supplements)
 await service.emitHealthUpdated('fictional-user',record,{...record,supplements:entry('2')},baby)
 assert.deepEqual(captured.at(-1).data.changes.supplements,{old:entry('1'),new:entry('2')})
 assert.equal(captured.at(-1).data.supplements,entry('2'))
})
