import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
const oldLoad=Module._load
const entries='[{"id":"DHA","name":"历史DHA","amount":"1","unit":"粒"}]'
Module._load=function(name,...args){
 if(name==='@/lib/prisma')return {prisma:{feedingRecord:{findMany:async()=>[]},healthRecord:{findMany:async({select})=>{if (!select.id) return []; assert.equal(select.supplements,true,'SSR must select nutrition snapshots');return [{id:'record',type:'AD_VITAMIN',recordedAt:new Date('2026-10-23T01:00:00Z'),supplements:entries,toothEruptions:[]}]}}}}
 if(name==='@/lib/server-auth')return {getServerSession:async()=>({user:{id:'fictional-user'}})}
 if(name==='@/lib/server-babies')return {getPreloadedBabies:async()=>({babies:[{id:'fictional-baby',name:'虚构宝宝'}],activeBabyId:'fictional-baby'})}
 return oldLoad.call(this,name,...args)
}
const timeline=load('lib/server-timeline.ts')
const {createComposerDraft}=load('components/record-composer/record-types.tsx')
Module._load=oldLoad
test('new nutrition drafts do not assume AD was given',()=>{
 const draft=createComposerDraft('fictional-baby','2026-10-23T09:00')
 assert.equal(draft.adGiven,false)
 assert.equal(draft.vitaminDGiven,false)
})
test('server timeline preload retains nutrition snapshot for initial render and edit',async()=>{
 const {initialRecords:records}=await timeline.getPreloadedTimelinePageData()
 assert.equal(records[0].supplements,entries)
})
