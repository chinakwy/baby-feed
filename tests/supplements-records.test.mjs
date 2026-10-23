import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
import {NextRequest} from 'next/server.js'
const babyId='c123456789012345678901234'
const id='c234567890123456789012345'
const entries=[{id:'DHA',name:'旧DHA',amount:'2',unit:'粒'}]
const userId='fictional-user'
let stored, archived
const baby={id:babyId,createdBy:userId,birthDate:new Date('2026-01-01')}
const existing={id,babyId,createdBy:userId,type:'AD_VITAMIN',adGiven:false,vitaminDGiven:false,supplements:JSON.stringify(entries),recordedAt:new Date('2026-10-23T01:00:00Z'),updatedAt:new Date('2026-10-23T01:00:00Z'),baby,toothEruptions:[]}
const tx={toothEruption:{deleteMany:async()=>({count:0})},healthRecord:{
 create:async({data})=>{stored={...existing,...data};return stored},
 findFirst:async()=>stored||existing,
 updateMany:async({data})=>{stored={...existing,...data};return {count:1}},
},deletedRecord:{create:async({data})=>{archived=data},findFirst:async()=>archived,deleteMany:async()=>({count:1})},baby:{findFirst:async()=>baby}}
const oldLoad=Module._load
Module._load=function(name,...args){
 if(name==='@/lib/auth')return {auth:async()=>({user:{id:userId}})}
 if(name==='@/lib/prisma')return {prisma:{...tx,$transaction:fn=>fn(tx)}}
 if(name==='next/cache')return {revalidatePath(){}}
 if(name==='@/lib/rate-limit')return {buildUserActionKey:()=>'',enforceRateLimit:()=>({allowed:true})}
 if(name==='@/lib/rate-limit-config')return {getRateLimit:()=>({limit:10,windowMs:60000})}
 if(name==='@/lib/webhook-service')return {emitHealthCreated:async()=>{},emitHealthUpdated:async()=>{}}
 if(name==='@/lib/reminder-rescheduler')return {rescheduleIntervalRulesForRecordChange:async()=>{}}
 if(name==='@/lib/reminder-auto-vaccine')return {syncAutoVaccineReminders:async()=>{}}
 return oldLoad.call(this,name,...args)
}
const createRoute=load('app/api/health/route.ts')
const editRoute=load('app/api/health/[id]/route.ts')
const trash=load('lib/deleted-records.ts')
const {buildHealthRecordPayload}=load('lib/health-records.ts')
Module._load=oldLoad
const request=(body,method='POST')=>new NextRequest(`http://localhost:3000/api/health?babyId=${babyId}`,{method,headers:{origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify(body)})
test('DHA-only record payload creates and notes-only update preserves historical quantity snapshot',async()=>{
 const payload=buildHealthRecordPayload('AD_VITAMIN',{adGiven:false,vitaminDGiven:false,supplements:entries})
 assert.deepEqual(payload.supplements,entries)
 const created=await createRoute.POST(request({...payload,type:'AD_VITAMIN',babyId,recordedAt:'2026-10-23T01:00:00Z'}))
 assert.equal(created.status,201)
 assert.deepEqual(JSON.parse(stored.supplements),entries)
 const edited=await editRoute.PUT(request({notes:'虚构记录备注'},'PUT'),{params:Promise.resolve({id})})
 assert.equal(edited.status,200,JSON.stringify(await edited.json()))
 assert.deepEqual(JSON.parse(stored.supplements),entries)
})
test('recycle snapshot and restore preserve supplement JSON and old AD booleans',async()=>{
 const record={...existing,baby:undefined,toothEruptions:[]}
 await trash.archiveDeletedRecord(tx,userId,'health',record)
 archived={...archived,id:'fictional-trash'}
 const restored=await trash.restoreDeletedRecord(userId,archived.id)
 assert.deepEqual(JSON.parse(restored.record.supplements),entries)
 assert.equal(restored.record.adGiven,false)
})
test('API stores canonical nutrition snapshots and synchronizes legacy AD markers from supplied entries',async()=>{
 const response=await createRoute.POST(request({type:'AD_VITAMIN',babyId,recordedAt:'2026-10-23T01:00:00Z',adGiven:false,vitaminDGiven:true,supplements:[{id:'AD',name:' AD ',amount:' 1 ',unit:' 粒 ',ignored:'discard'}]}))
 assert.equal(response.status,201)
 assert.deepEqual(JSON.parse(stored.supplements),[{id:'AD',name:'AD',amount:'1',unit:'粒'}])
 assert.equal(stored.adGiven,true)
 assert.equal(stored.vitaminDGiven,false)
 const edited=await editRoute.PUT(request({supplements:entries,adGiven:true,vitaminDGiven:true},'PUT'),{params:Promise.resolve({id})})
 assert.equal(edited.status,200)
 assert.equal(stored.adGiven,false)
 assert.equal(stored.vitaminDGiven,false)
})
test('explicitly empty supplement selection cannot be masked by legacy AD booleans in create or edit',async()=>{
 const before=stored
 const created=await createRoute.POST(request({type:'AD_VITAMIN',babyId,recordedAt:'2026-10-23T01:00:00Z',supplements:[],adGiven:true}))
 assert.equal(created.status,400)
 assert.equal(stored,before)
 const edited=await editRoute.PUT(request({supplements:[],adGiven:true},'PUT'),{params:Promise.resolve({id})})
 assert.equal(edited.status,400)
 assert.equal(stored,before)
})
