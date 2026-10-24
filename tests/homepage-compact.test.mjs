import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Cards=load('components/HomepageSummaryCards.tsx').default
const methods=['BREAST_MILK','BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD']
const keys=['FEEDING','AD_VITAMIN','DIAPER','SLEEP']
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
test('supplements collapse excess projects, expand full names and preserve record action',()=>{
 for(const count of [1,2,3,4,12]){
  const definitions=Array.from({length:count},(_,i)=>({id:'supp'+i,name:'测试营养项目'+i,enabled:true,unit:''}))
  const opened=[];const r=create({supplements:definitions,entries:[{id:'supp0',name:'测试营养项目0'}],onRecord:type=>opened.push(type)})
  try{
   const visible=r.root.findAll(n=>n.type==='span'&&n.props['data-supplement-chip']);assert.equal(visible.length,Math.min(count,3))
   assert.equal(visible[0].props['data-given'],true)
   const more=r.root.findAll(n=>n.type==='button'&&n.props['aria-label']==='查看全部营养补充项目')
   assert.equal(more.length,count>3?1:0)
   if(more.length){TestRenderer.act(()=>more[0].props.onClick());const expanded=r.root.findByProps({role:'dialog'});for(const item of definitions)assert.ok(text(expanded).includes(item.name));assert.equal(expanded.findAllByType('a').length,0)}
   r.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录营养补充').props.onClick();assert.deepEqual(opened,['AD_VITAMIN'])
  }finally{r.unmount()}
 }
})

test('nutrition capacity keeps readable labels and reserves a touch target for hidden projects',()=>{
 const {getSupplementVisibleCount}=load('components/HomepageSupplementSummary.tsx')
 assert.equal(typeof getSupplementVisibleCount,'function')
 for(const count of [1,2,3,4,12])for(const width of [96,120,160,240,400]){
  const shown=getSupplementVisibleCount(width,count)
  assert.ok(shown>=1&&shown<=Math.min(3,count))
  if(count>shown)assert.ok(shown===1||shown*56+(shown-1)*6+50<=width)
 }
 assert.equal(getSupplementVisibleCount(240,3),3)
 assert.equal(getSupplementVisibleCount(120,12),1)
})

test('one long supplement name can open the full-name dialog without needing hidden projects',()=>{
 const name='这是一个用于验证手机完整查看的很长营养项目名称'
 const r=create({supplements:[{id:'LONG',name,enabled:true,unit:''}]})
 try{const chip=r.root.find(n=>n.type==='button'&&n.props['aria-label']==='查看营养项目'+name);TestRenderer.act(()=>chip.props.onClick());assert.ok(text(r.root.findByProps({role:'dialog'})).includes(name))}finally{r.unmount()}
})
