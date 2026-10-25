import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const settings=load('lib/homepage-settings.ts')
const Cards=load('components/HomepageSummaryCards.tsx').default
const Manager=load('components/HomepageSettings.tsx').default
const {act}=TestRenderer

test('legacy sections become fixed while feeding choices are validated and persisted',()=>{
 const parsed=settings.parseHomepageSettings(JSON.stringify({sections:[],cards:['FEEDING','SLEEP'],feedingTypes:['FORMULA','SOLID_FOOD']}))
 assert.deepEqual(parsed.sections,[...settings.HOME_SECTION_KEYS])
 assert.deepEqual(parsed.feedingTypes,['FORMULA','SOLID_FOOD'])
 assert.equal(typeof settings.validateHomepageSettings({...parsed,feedingTypes:['PRIVATE']}),'string')
 assert.equal(typeof settings.validateHomepageSettings({...parsed,feedingTypes:['FORMULA','FORMULA']}),'string')
 assert.deepEqual(settings.parseHomepageSettings('{"sections":[],"cards":[]}').feedingTypes,['BREAST_MILK','BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD'])
})
test('four compact summaries contain no management links and honor chosen feeding methods',()=>{
 let clicked=0
 const renderer=TestRenderer.create(React.createElement(Cards,{cards:['FEEDING','SLEEP','DIAPER','AD_VITAMIN'],feedingTypes:['FORMULA','SOLID_FOOD'],stats:{formulaCount:2,totalFormulaAmount:180,solidFoodCount:1},onRecord(){clicked++}}))
 try{
  const cards=renderer.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-card'])
  assert.equal(cards.length,4)
  assert.equal(renderer.root.findAllByType('a').length,0)
  const feeding=cards.find(n=>n.props['data-home-card']==='FEEDING')
  const read=n=>typeof n==='string'?n:(n.children||[]).map(read).join('');const text=read(feeding)
  assert.match(text,/辅食/);assert.match(text,/180ml/);assert.doesNotMatch(text,/亲喂|母乳瓶喂/)
  feeding.find(n=>n.type==='button'&&n.props['data-feeding-method']==='FORMULA').props.onClick();assert.equal(clicked,1)
 }finally{renderer.unmount()}
})
test('manager removes section editing and saves feeding configuration beside card order',async t=>{
 const previousFetch=global.fetch,previousSelf=global.self
 global.self={setTimeout,clearTimeout}
 const original={sections:[...settings.HOME_SECTION_KEYS],cards:['FEEDING','SLEEP','DIAPER','AD_VITAMIN'],feedingTypes:['BREAST_MILK','FORMULA','SOLID_FOOD']}
 let submitted
 global.fetch=async(url,options={})=>({ok:true,json:async()=>{if(options.method==='PUT'){submitted=JSON.parse(options.body);return submitted}return original}})
 let renderer;t.after(()=>{if(renderer)act(()=>renderer.unmount());global.fetch=previousFetch;global.self=previousSelf})
 await act(async()=>{renderer=TestRenderer.create(React.createElement(Manager,{onBack(){}}))})
 assert.equal(renderer.root.findAll(n=>n.type==='input'&&n.props['aria-label']==='显示近期备忘').length,0)
 assert.ok(JSON.stringify(renderer.toJSON()).includes('营养补充项目管理'))
 await act(async()=>renderer.root.find(n=>n.type==='input'&&n.props['aria-label']==='显示母乳亲喂').props.onChange())
 await act(async()=>renderer.root.findAllByType('button').find(n=>n.children.includes('保存')).props.onClick())
 assert.deepEqual(submitted.feedingTypes,['FORMULA','SOLID_FOOD'])
 assert.deepEqual(submitted.sections,[...settings.HOME_SECTION_KEYS])
})
test('collapsing nutrition management preserves an unfinished project name',async t=>{
 const oldFetch=global.fetch,oldWindow=global.window,oldSelf=global.self
 global.window={location:{search:''}};global.self={setTimeout,clearTimeout}
 global.fetch=async url=>({ok:true,json:async()=>url==='/api/user/homepage'?settings.defaultHomepageSettings():url==='/api/babies'?[{id:'fictional-baby',name:'虚构宝宝'}]:{definitions:[{id:'DHA',name:'DHA',unit:'',enabled:true}],version:'2026-10-23T01:00:00Z'}})
 let renderer;t.after(()=>{if(renderer)act(()=>renderer.unmount());global.fetch=oldFetch;global.window=oldWindow;global.self=oldSelf})
 await act(async()=>{renderer=TestRenderer.create(React.createElement(Manager,{onBack(){}}))})
 const toggle=()=>renderer.root.find(n=>n.type==='button'&&n.children.includes('营养补充项目管理'))
 await act(async()=>toggle().props.onClick())
 await act(async()=>renderer.root.find(n=>n.type==='input'&&n.props['aria-label']==='DHA 名称').props.onChange({target:{value:'尚未保存的新名称'}}))
 await act(async()=>toggle().props.onClick())
 await act(async()=>toggle().props.onClick())
 assert.equal(renderer.root.find(n=>n.type==='input'&&n.props['aria-label']==='DHA 名称').props.value,'尚未保存的新名称')
})
