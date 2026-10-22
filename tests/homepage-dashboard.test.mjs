import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
const { act } = TestRenderer
let opened = []
const originalLoad = Module._load
// Isolate the record-launch boundary: the actual dashboard, stats and layout run unchanged.
Module._load = function (name, ...args) {
  if (name === '@/components/RecordComposerProvider') return { useRecordComposer: () => ({ openComposer: (...args) => opened.push(args) }) }
  return originalLoad.call(this, name, ...args)
}
const Dashboard = load('components/Dashboard.tsx').default
Module._load = originalLoad
const { invalidateRecordRelatedCaches } = load('lib/cache-helpers.ts')
const defaults = { sections: ['BABY', 'SUMMARY', 'HEALTH', 'MEMOS', 'QUICK_RECORDS', 'TODAY_RECORDS'], cards: ['BREAST_MILK', 'FORMULA', 'AD_VITAMIN', 'DIAPER'] }
const feeding = amount => ({ id: 'formula-'+amount, type: 'FORMULA', formulaAmount: amount, startTime: '2026-10-22T08:00:00+08:00', recordType: 'feeding' })
async function setup(t, settings = defaults, preloadedSettings = settings) {
  opened = []
  const oldWindow = global.window, oldFetch = global.fetch, oldSelf = global.self
  global.window = Object.assign(new EventTarget(), { setTimeout, clearTimeout, sessionStorage: { getItem: () => null, setItem() {} } })
  global.self = global.window
  let records = [feeding(100)]
  global.fetch = async url => ({ ok: true, json: async () => url === '/api/user/homepage' ? settings : url.startsWith('/api/feeding') ? records : [] })
  let renderer
  await act(async () => { renderer = TestRenderer.create(React.createElement(Dashboard, {
    selectedBabyId: 'test-baby', initialBabies: [{ id: 'test-baby', name: '虚构首页宝宝', birthDate: '2026-06-01', gender: 'FEMALE' }],
    initialTodayRecords: records, initialTodayHealthRecords: [], initialHomepageSettings: preloadedSettings,
  })) })
  t.after(() => { act(() => renderer.unmount()); global.window = oldWindow; global.fetch = oldFetch; global.self = oldSelf })
  return { renderer, setRecords(value) { records = value } }
}

test('summary cards launch the matching new-record form for the selected baby', async t => {
  const { renderer } = await setup(t)
  for (const [label, type] of [['母乳','BREAST_MILK'],['奶粉','FORMULA'],['营养补充','AD_VITAMIN'],['大小便','DIAPER']]) {
    const buttons = renderer.root.findAll(n => n.type === 'button' && n.props['aria-label'] === '记录'+label)
    assert.equal(buttons.length, 1, label+' summary must be a record button')
    await act(async () => buttons[0].props.onClick())
    assert.deepEqual(opened.at(-1), [type, { patch: { babyId: 'test-baby' } }])
  }
})

test('homepage honors persisted section/card visibility and ordering', async t => {
  const { renderer } = await setup(t, { sections: ['TODAY_RECORDS', 'SUMMARY'], cards: ['DIAPER', 'FORMULA'] })
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).map(n => n.props['data-home-section']), ['TODAY_RECORDS','SUMMARY'])
  assert.deepEqual(renderer.root.findAll(n => n.type === 'button' && n.props['data-home-card']).map(n => n.props['data-home-card']), ['DIAPER','FORMULA'])
})

test('hiding every section keeps an accessible way back to homepage management', async t => {
  const { renderer } = await setup(t, { sections: [], cards: [] })
  assert.ok(renderer.root.findAll(n => n.props.href === '/settings/homepage').length)
  assert.equal(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).length, 0)
})

test('saving a record refreshes homepage totals/list even when preloaded props stay unchanged', async t => {
  const { renderer, setRecords } = await setup(t)
  setRecords([feeding(100), feeding(120)])
  await act(async () => invalidateRecordRelatedCaches('test-baby'))
  const formula = renderer.root.find(n => n.type === 'button' && n.props['data-home-card'] === 'FORMULA')
  assert.match(formula.findAllByType('p').map(n => n.children.join(' ')).join(' '), /220/)
  assert.match(JSON.stringify(renderer.toJSON()), /奶粉喂养 120ml/)
})


test('returning home reads saved preferences instead of retaining stale navigation props', async t => {
  const { renderer } = await setup(t, { sections: ['SUMMARY'], cards: ['FORMULA'] }, defaults)
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).map(n => n.props['data-home-section']), ['SUMMARY'])
  assert.deepEqual(renderer.root.findAll(n => n.type === 'button' && n.props['data-home-card']).map(n => n.props['data-home-card']), ['FORMULA'])
})
