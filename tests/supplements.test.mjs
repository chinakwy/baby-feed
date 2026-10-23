import test from 'node:test'
import assert from 'node:assert/strict'
import * as supplements from '../lib/supplements.ts'

test('nutrition catalog starts with AD, vitamin D and DHA without dosage defaults', () => {
  assert.deepEqual(supplements.readSupplementSettings(null).map(x => [x.id, x.unit]), [['AD', ''], ['VITAMIN_D', ''], ['DHA', '']])
})
test('historical names and optional quantity survive catalog renaming and legacy markers merge once', () => {
  const entries = supplements.readRecordSupplements({adGiven: true, supplements: JSON.stringify([{id:'AD',name:'旧AD',amount:'1',unit:'粒'},{id:'DHA',name:'DHA'}])})
  assert.deepEqual(entries.map(supplements.formatSupplement), ['旧AD 1粒','DHA'])
  assert.deepEqual(supplements.readRecordSupplements({vitaminDGiven:true}), [{id:'VITAMIN_D',name:'维D'}])
})
test('malformed, unbounded and duplicate snapshots/catalog definitions are rejected', () => {
  for (const value of [{}, [{id:'DHA',name:'DHA',amount:'-1'}], [{id:'DHA',name:'DHA',amount:'1'}], [{id:'DHA',name:'DHA'},{id:'DHA',name:'DHA'}]]) assert.throws(() => supplements.validateSupplementEntries(value))
  assert.throws(() => supplements.validateSupplementDefinitions([{id:'arbitrary',name:'X',unit:'',enabled:true}]))
  assert.throws(() => supplements.validateSupplementDefinitions(Array(31).fill({id:'DHA',name:'DHA',unit:'',enabled:true})))
})
test('disabled definitions retain selected historical entries for editing', () => {
  assert.deepEqual(supplements.getVisibleSupplements([{id:'DHA',name:'新名',unit:'',enabled:false}], [{id:'DHA',name:'旧名'}]).map(x=>x.name), ['旧名'])
})
test('unfinished nutrition drafts retain typed amount until unit and decimal are completed',()=>{
 assert.deepEqual(supplements.readSupplementDraftEntries([{id:'DHA',name:'DHA',amount:'1.',unit:''}]),[{id:'DHA',name:'DHA',amount:'1.',unit:''}])
 assert.throws(()=>supplements.validateSupplementEntries([{id:'DHA',name:'DHA',amount:'1.',unit:''}]))
})
