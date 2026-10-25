import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Cards=load('components/HomepageSummaryCards.tsx').default
const methods=['BREAST_MILK','BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD']
const keys=['FEEDING','SLEEP','DIAPER','AD_VITAMIN']
const text=n=>typeof n==='string'?n:(n.children||[]).map(text).join('')
const create=props=>TestRenderer.create(React.createElement(Cards,{cards:keys,stats:{breastFeedingCount:3,totalBreastDuration:25,breastBottleCount:1,totalBreastMilkAmount:1200,formulaCount:2,totalFormulaAmount:150,solidFoodCount:1,sleepMinutes:620,sleepCount:2},onRecord(){},...props}))
test('one outer feeding card uses exactly the enabled number of columns and each method records its own type',()=>{
 for(let count=1;count<=4;count++){
  const opened=[];const r=create({feedingTypes:methods.slice(0,count),onRecord:key=>opened.push(key)})
  try{
   const outer=r.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-card']==='FEEDING');assert.equal(outer.length,1)
   assert.equal(outer[0].props['data-feeding-columns'],count)
   const items=r.root.findAll(n=>n.type==='button'&&n.props['data-feeding-method']);assert.equal(items.length,count)
   for(const item of items)item.props.onClick()
   assert.deepEqual(opened,methods.slice(0,count));assert.doesNotMatch(text(outer[0]),/今日喂养/)
  }finally{r.unmount()}
 }
})
test('fixed stats order ignores former custom order while card visibility remains configurable',()=>{
 const r=create({cards:['SLEEP','DIAPER','AD_VITAMIN','FEEDING']})
 try{assert.deepEqual(r.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-card']).map(n=>n.props['data-home-card']),keys)}finally{r.unmount()}
 const hidden=create({cards:['SLEEP']})
 try{assert.deepEqual(hidden.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-card']).map(n=>n.props['data-home-card']),['SLEEP'])}finally{hidden.unmount()}
})
test('all configured supplements stay visible within a single full-card record button',()=>{
 for(const count of [1,2,3,4,12]){
  const definitions=Array.from({length:count},(_,i)=>({id:'supp'+i,name:'测试营养项目'+i,enabled:true,unit:''}))
  const opened=[];const r=create({supplements:definitions,entries:[{id:'supp0',name:'测试营养项目0'}],onRecord:type=>opened.push(type)})
  try{
   const visible=r.root.findAll(n=>n.type==='span'&&n.props['data-supplement-chip']);assert.equal(visible.length,count)
   assert.equal(visible[0].props['data-given'],true)
   const more=r.root.findAll(n=>n.type==='button'&&n.props['aria-label']==='查看全部营养补充项目')
   assert.equal(more.length,0)
   assert.equal(r.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录营养补充').findAllByType('button').length,1)
   for(const item of definitions)assert.ok(text(r.root).includes(item.name))
   r.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录营养补充').props.onClick();assert.deepEqual(opened,['AD_VITAMIN'])
  }finally{r.unmount()}
 }
})

test('nutrition wraps all projects instead of using a measured-width visibility budget',()=>{
 const r=create({supplements:Array.from({length:12},(_,i)=>({id:'wrap'+i,name:'营养补充'+i,enabled:true,unit:''}))})
 try{const chips=r.root.findAll(n=>n.type==='span'&&n.props['data-supplement-chip']);assert.equal(chips.length,12);assert.match(chips[0].parent.parent.props.className,/flex-wrap/)}finally{r.unmount()}
})

test('long supplement names remain fully visible and share the full-card record action',()=>{
 const name='这是一个用于验证手机完整查看的很长营养项目名称'
 const r=create({supplements:[{id:'LONG',name,enabled:true,unit:''}]})
 try{const card=r.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录营养补充');assert.ok(text(card).includes(name));assert.equal(card.findAll(n=>n.type==='button').length,1)}finally{r.unmount()}
})

test('sleep and diaper share equal columns and card sizing; nutrition follows separately',()=>{
 const opened=[];const r=create({onRecord:key=>opened.push(key)})
 try{
  const row=r.root.findByProps({'data-summary-row':'sleep-diaper'})
  assert.match(row.props.className,/grid-cols-2/)
  const pair=row.findAll(n=>n.type==='button'&&n.props['data-home-card'])
  assert.deepEqual(pair.map(n=>n.props['data-home-card']),['SLEEP','DIAPER'])
  assert.equal(pair[0].props.className,pair[1].props.className)
  pair.forEach(n=>n.props.onClick());assert.deepEqual(opened,['SLEEP','DIAPER'])
 }finally{r.unmount()}
 for(const key of ['SLEEP','DIAPER']){const single=create({cards:[key]});try{assert.match(single.root.findByProps({'data-summary-row':'sleep-diaper'}).props.className,/grid-cols-1/)}finally{single.unmount()}}
})
