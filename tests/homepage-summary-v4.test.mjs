import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Cards=load('components/HomepageSummaryCards.tsx').default
const text=node=>typeof node==='string'?node:(node.children||[]).map(text).join('')
const render=props=>TestRenderer.create(React.createElement(Cards,{cards:['FEEDING','SLEEP','AD_VITAMIN','DIAPER'],onRecord(){},...props}))

test('selected feeding methods each retain their icon, quantity and count',()=>{
 const r=render({feedingTypes:['BREAST_MILK_BOTTLE','FORMULA'],stats:{breastBottleCount:3,totalBreastMilkAmount:1200,formulaCount:2,totalFormulaAmount:180}})
 try{
  const rows=r.root.findAll(n=>n.type==='span'&&n.props['data-feeding-method'])
  assert.deepEqual(rows.map(n=>n.props['data-feeding-method']),['BREAST_MILK_BOTTLE','FORMULA'])
  for(const row of rows)assert.equal(row.findAllByType('svg').length,1)
  assert.match(text(rows[0]),/母乳瓶喂.*1200ml.*3次/)
  assert.match(text(rows[1]),/奶粉.*180ml.*2次/)
 }finally{r.unmount()}
})
test('nutrition explicitly groups every taken and pending name, retaining disabled historical intake',()=>{
 const r=render({stats:{adGiven:true},supplements:[{id:'AD',name:'AD',enabled:true},{id:'VITAMIN_D',name:'维D',enabled:true},{id:'DHA',name:'DHA',enabled:true},{id:'IRON',name:'铁补充剂',enabled:true},{id:'OFF',name:'停用未服用',enabled:false}],entries:[{id:'OLD',name:'历史已服用'}]})
 try{
  const groups=r.root.findAll(n=>n.type==='span'&&n.props['data-supplement-status'])
  assert.equal(groups.length,2)
  assert.equal(groups[0].props['data-supplement-status'],'given')
  assert.match(text(groups[0]),/已补充.*AD.*历史已服用/)
  assert.doesNotMatch(text(groups[0]),/维D|DHA|铁补充剂/)
  assert.match(text(groups[1]),/未补充.*维D.*DHA.*铁补充剂/)
  assert.doesNotMatch(text(groups[1]),/停用未服用/)
 }finally{r.unmount()}
})
test('nutrition empty states distinguish none taken from all taken and no enabled items',()=>{
 for(const [supplements,entries,expected] of [
  [[{id:'DHA',name:'DHA',enabled:true}],[],['暂无','未补充DHA']],
  [[{id:'DHA',name:'DHA',enabled:true}],[{id:'DHA',name:'DHA'}],['已补充DHA','全部已补充']],
  [[],[],['尚未启用补充项目']],
 ]){
  const r=render({supplements,entries})
  try{const body=text(r.root.find(n=>n.type==='button'&&n.props['data-home-card']==='AD_VITAMIN'));for(const value of expected)assert.ok(body.includes(value),body)}finally{r.unmount()}
 }
})

test('four feeding methods form a two-column grid with compact icons while two remain roomy',()=>{
 for(const count of [2,4]){
  const r=render({feedingTypes:['BREAST_MILK','BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD'].slice(0,count)})
  try{
   const methods=r.root.findAll(n=>n.type==='span'&&n.props['data-feeding-method'])
   assert.equal(methods.length,count)
   const container=methods[0].parent
   assert.equal(container.props.className.includes('grid-cols-2'),count===4)
   for(const method of methods)assert.equal(method.findByType('svg').props.width,count===4?14:19)
  }finally{r.unmount()}
 }
})

test('feeding amount and count share a baseline row with the icon beside the name',()=>{
 for(const count of [2,4]){
  const r=render({feedingTypes:['BREAST_MILK_BOTTLE','FORMULA','BREAST_MILK','SOLID_FOOD'].slice(0,count),stats:{breastBottleCount:3,totalBreastMilkAmount:1200}})
  try{
   const method=r.root.find(n=>n.type==='span'&&n.props['data-feeding-method']==='BREAST_MILK_BOTTLE')
   const amount=method.find(n=>n.type==='span'&&n.children.includes('1200ml'))
   const times=method.find(n=>n.type==='span'&&text(n)==='3次')
   assert.equal(amount.parent,times.parent)
   assert.match(amount.parent.props.className,/items-baseline/)
   const name=method.find(n=>n.type==='span'&&n.children.includes('母乳瓶喂'))
   assert.equal(name.parent.findAllByType('svg').length,1)
  }finally{r.unmount()}
 }
})

test('compact feeding gets a full mobile row without splitting amount/unit or leaving singleton gaps',()=>{
 for(const cards of [['FEEDING','SLEEP','AD_VITAMIN','DIAPER'],['SLEEP','FEEDING','AD_VITAMIN','DIAPER']]){
  const r=render({cards})
  try{
   const buttons=r.root.findAll(n=>n.type==='button'&&n.props['data-home-card'])
   const feeding=buttons.find(n=>n.props['data-home-card']==='FEEDING')
   assert.match(feeding.props.className,/col-span-2 sm:col-span-1/)
   let slots=0
   for(const button of buttons){
    const width=button.props.className.includes('col-span-2 sm:col-span-1')?2:1
    if(width===2)assert.equal(slots%2,0,'wide cards must start at a new row')
    slots+=width
   }
   assert.equal(slots%2,0)
   const amount=feeding.findAll(n=>n.type==='span'&&typeof n.props.className==='string'&&n.props.className.includes('tabular-nums'))[0]
   assert.match(amount.props.className,/whitespace-nowrap/)
  }finally{r.unmount()}
 }
})
