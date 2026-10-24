import test from 'node:test'
import assert from 'node:assert/strict'
import load from './helpers/load-component.cjs'
let helpers={};try{helpers=load('lib/homepage-health.ts')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}
test('today health omits history and chooses latest same-day measurements in Beijing time',()=>{
 assert.equal(typeof helpers.todayHealthSummary,'function')
 const records=[{type:'WEIGHT',weight:5,recordedAt:'2026-10-23T10:00:00+08:00'},{type:'TEMPERATURE',temperature:36.5,recordedAt:'2026-10-24T00:00:00+08:00'},{type:'TEMPERATURE',temperature:36.8,recordedAt:'2026-10-24T12:00:00+08:00'}]
 assert.deepEqual(helpers.todayHealthSummary(records,'2026-10-24'),{temperature:36.8})
 assert.deepEqual(helpers.todayHealthSummary(records,'2026-10-25'),{})
})
