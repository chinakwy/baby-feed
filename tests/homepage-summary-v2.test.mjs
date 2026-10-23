import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const settings = load('lib/homepage-settings.ts')
const Cards = load('components/HomepageSummaryCards.tsx').default
let sleep = {}
try { sleep = load('lib/homepage-sleep.ts') } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }

test('default cards combine feeding and replace the former formula position with sleep', () => {
 assert.deepEqual(settings.defaultHomepageSettings().cards,['FEEDING','SLEEP','AD_VITAMIN','DIAPER'])
 const legacy={sections:['SUMMARY'],cards:['DIAPER','FORMULA','BREAST_MILK']}
 assert.deepEqual(settings.parseHomepageSettings(JSON.stringify(legacy)),{sections:[...settings.HOME_SECTION_KEYS],cards:['DIAPER','SLEEP','FEEDING'],feedingTypes:[...settings.HOME_FEEDING_KEYS]})
 assert.deepEqual(settings.parseHomepageSettings('{"sections":[],"cards":[]}'),{sections:[...settings.HOME_SECTION_KEYS],cards:[],feedingTypes:[...settings.HOME_FEEDING_KEYS]})
})
test('feeding card keeps separate method totals and opens the configured launcher', () => {
 const opened=[]
 const renderer=TestRenderer.create(React.createElement(Cards,{cards:['FEEDING','SLEEP'],stats:{breastFeedingCount:2,totalBreastDuration:25,breastBottleCount:1,totalBreastMilkAmount:80,formulaCount:2,totalFormulaAmount:150,sleepMinutes:90,sleepCount:2,sleeping:false},onRecord:type=>opened.push(type),onFeedingRecord:()=>opened.push('feeding-launcher')}))
 try {
  renderer.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录喂养').props.onClick()
  assert.equal(opened.at(-1),'feeding-launcher')
  renderer.root.find(n=>n.type==='button'&&n.props['aria-label']==='记录睡眠').props.onClick()
  assert.equal(opened.at(-1),'SLEEP')
  const body=JSON.stringify(renderer.toJSON());for(const value of ['25分钟','80ml','150ml','1小时30分钟'])assert.ok(body.includes(value),value)
 }finally{renderer.unmount()}
})
test('sleep is clipped to Beijing day, ongoing sleep is capped at now, overlaps do not inflate duration', () => {
 assert.equal(typeof sleep.summarizeHomepageSleep,'function')
 const records=[{type:'SLEEP',sleepStartTime:'2026-10-22T23:00:00+08:00',sleepEndTime:'2026-10-23T06:00:00+08:00'},{type:'SLEEP',sleepStartTime:'2026-10-23T05:00:00+08:00',sleepEndTime:'2026-10-23T06:30:00+08:00'},{type:'SLEEP',sleepStartTime:'2026-10-23T13:00:00+08:00',sleepEndTime:null}]
 assert.deepEqual(sleep.summarizeHomepageSleep(records,'2026-10-23',Date.parse('2026-10-23T14:00:00+08:00')),{sleepMinutes:450,sleepCount:3,sleeping:true})
 assert.deepEqual(sleep.summarizeHomepageSleep(records.slice(0,1),'2026-10-22',Date.parse('2026-10-23T14:00:00+08:00')),{sleepMinutes:60,sleepCount:1,sleeping:false})
})
test('sleep spanning an entire day or invalid spans are handled without negative totals', () => {
 assert.equal(typeof sleep.summarizeHomepageSleep,'function')
 assert.deepEqual(sleep.summarizeHomepageSleep([{type:'SLEEP',sleepStartTime:'2026-10-21T23:00:00+08:00',sleepEndTime:'2026-10-24T01:00:00+08:00'}],'2026-10-23',Date.parse('2026-10-25T00:00:00+08:00')),{sleepMinutes:1440,sleepCount:1,sleeping:false})
 assert.deepEqual(sleep.summarizeHomepageSleep([{type:'SLEEP',sleepStartTime:'invalid'},{type:'SLEEP',sleepStartTime:'2026-10-23T10:00:00+08:00',sleepEndTime:'2026-10-23T09:00:00+08:00'}],'2026-10-23'),{sleepMinutes:0,sleepCount:0,sleeping:false})
})
