import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Cards=load('components/HomepageSummaryCards.tsx').default
const text=node=>typeof node==='string'?node:(node.children||[]).map(text).join('')
const render=props=>TestRenderer.create(React.createElement(Cards,{cards:['FEEDING','SLEEP','DIAPER','AD_VITAMIN'],onRecord(){},...props}))
test('selected feeding methods retain icons, separate quantities/counts and omit inactive methods',()=>{
 const r=render({feedingTypes:['BREAST_MILK_BOTTLE','FORMULA'],stats:{breastBottleCount:3,totalBreastMilkAmount:1200,formulaCount:2,totalFormulaAmount:180}})
 try{const rows=r.root.findAll(n=>n.type==='button'&&n.props['data-feeding-method']);assert.deepEqual(rows.map(n=>n.props['data-feeding-method']),['BREAST_MILK_BOTTLE','FORMULA']);for(const row of rows)assert.equal(row.findAllByType('svg').length,1);assert.match(text(rows[0]),/瓶喂.*1200ml.*3次/);assert.match(text(rows[1]),/奶粉.*180ml.*2次/)}finally{r.unmount()}
})
test('nutrition compact states retain legacy AD and disabled historical intake, hide inactive untaken items',()=>{
 const r=render({stats:{adGiven:true},supplements:[{id:'AD',name:'AD',enabled:true},{id:'OFF',name:'停用未服用',enabled:false}],entries:[{id:'OLD',name:'历史已服用'}]})
 try{const chips=r.root.findAll(n=>n.type==='span'&&n.props['data-supplement-chip']);assert.deepEqual(chips.map(n=>n.props['data-supplement-chip']),['AD','OLD']);assert.ok(chips.every(n=>n.props['data-given']));assert.doesNotMatch(text(r.root),/停用未服用/)}finally{r.unmount()}
})
test('empty nutrition catalog has an explicit empty state without a misleading fraction',()=>{
 const r=render({supplements:[],entries:[]})
 try{const card=r.root.find(n=>typeof n.type==='string'&&n.props['data-home-card']==='AD_VITAMIN');assert.match(text(card),/暂无补充项目/);assert.doesNotMatch(text(card),/0\/0/)}finally{r.unmount()}
})
