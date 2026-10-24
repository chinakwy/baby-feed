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
const defaults = { sections: ['BABY', 'SUMMARY', 'HEALTH', 'MEMOS', 'QUICK_RECORDS', 'TODAY_RECORDS'], cards: ['FEEDING', 'SLEEP', 'AD_VITAMIN', 'DIAPER'] }
const feeding = amount => ({ id: 'formula-'+amount, type: 'FORMULA', formulaAmount: amount, startTime: '2026-10-22T08:00:00+08:00', recordType: 'feeding' })
async function setup(t, settings = defaults, preloadedSettings = settings, extra = {}) {
  opened = []
  const oldWindow = global.window, oldFetch = global.fetch, oldSelf = global.self
  global.window = Object.assign(new EventTarget(), { setTimeout, clearTimeout, sessionStorage: { getItem: () => null, setItem() {} } })
  global.self = global.window
  let records = [feeding(100)]
  global.fetch = async url => ({ ok: true, json: async () => url === '/api/user/homepage' ? settings : url.startsWith('/api/feeding') ? records : [] })
  let renderer
  await act(async () => { renderer = TestRenderer.create(React.createElement(Dashboard, {
    selectedBabyId: 'test-baby', initialBabies: [{ id: 'test-baby', name: '虚构首页宝宝', birthDate: '2026-06-01', gender: 'FEMALE' }],
    initialTodayRecords: records, initialTodayHealthRecords: [], initialHomepageSettings: preloadedSettings, ...extra,
  })) })
  t.after(() => { act(() => renderer.unmount()); global.window = oldWindow; global.fetch = oldFetch; global.self = oldSelf })
  return { renderer, setRecords(value) { records = value } }
}

test('summary cards launch the matching new-record form for the selected baby', async t => {
  const { renderer } = await setup(t)
  await act(async () => renderer.root.find(n => n.type === 'button' && n.props['data-feeding-method'] === 'FORMULA').props.onClick())
  assert.deepEqual(opened.at(-1), ['FORMULA', { patch: { babyId: 'test-baby' } }])
  for (const [label, type] of [['睡眠','SLEEP'],['营养补充','AD_VITAMIN'],['大小便','DIAPER']]) {
    const buttons = renderer.root.findAll(n => n.type === 'button' && n.props['aria-label'] === '记录'+label)
    assert.equal(buttons.length, 1, label+' summary must be a record button')
    await act(async () => buttons[0].props.onClick())
    assert.deepEqual(opened.at(-1), [type, { patch: { babyId: 'test-baby' } }])
  }
})

test('homepage honors persisted section/card visibility and ordering', async t => {
  const { renderer } = await setup(t, { sections: ['TODAY_RECORDS', 'SUMMARY'], cards: ['DIAPER', 'SLEEP'] })
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).map(n => n.props['data-home-section']), ['BABY','SUMMARY','QUICK_RECORDS','TODAY_RECORDS'])
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-card']).map(n => n.props['data-home-card']), ['DIAPER','SLEEP'])
})

test('old hidden-section settings cannot hide the fixed homepage blocks', async t => {
  const { renderer } = await setup(t, { sections: [], cards: [] })
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).map(n => n.props['data-home-section']), ['BABY','QUICK_RECORDS','TODAY_RECORDS'])
})

test('saving a record refreshes homepage totals/list even when preloaded props stay unchanged', async t => {
  const { renderer, setRecords } = await setup(t)
  setRecords([feeding(100), feeding(120)])
  await act(async () => invalidateRecordRelatedCaches('test-baby'))
  const formula = renderer.root.find(n => typeof n.type === 'string' && n.props['data-home-card'] === 'FEEDING')
  assert.match(formula.findAllByType('span').flatMap(n => n.children.filter(child => typeof child === 'string')).join(' '), /220/)
  assert.match(JSON.stringify(renderer.toJSON()), /奶粉喂养 120ml/)
})


test('returning home reads saved preferences instead of retaining stale navigation props', async t => {
  const { renderer } = await setup(t, { sections: ['SUMMARY'], cards: ['SLEEP'] }, defaults)
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-section']).map(n => n.props['data-home-section']), ['BABY','SUMMARY','QUICK_RECORDS','TODAY_RECORDS'])
  assert.deepEqual(renderer.root.findAll(n => typeof n.type === 'string' && n.props['data-home-card']).map(n => n.props['data-home-card']), ['SLEEP'])
})


test('recent memos precede today-only health; historical measurements and ineligible memos leave no empty blocks', async t => {
 const now=new Date().toISOString()
 const health={id:'health-today',type:'TEMPERATURE',recordedAt:now,temperature:36.6,recordType:'health'}
 const memo={id:'memo-soon',title:'虚构近期备忘',content:null,scheduledAt:new Date(Date.now()+86400000).toISOString(),completed:false,completedAt:null}
 const {renderer}=await setup(t,defaults,defaults,{initialTodayHealthRecords:[health],initialRecentMemos:[memo]})
 const sections=()=>renderer.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-section']).map(n=>n.props['data-home-section'])
 assert.deepEqual(sections(),['BABY','SUMMARY','MEMOS','HEALTH','QUICK_RECORDS','TODAY_RECORDS'])
})
test('historical health and out-of-window/completed memos do not fill today dashboard',async t=>{
 const {renderer}=await setup(t,defaults,defaults,{initialTodayHealthRecords:[{id:'past-weight',type:'WEIGHT',recordedAt:new Date(Date.now()-3*86400000).toISOString(),weight:5,recordType:'health'}],initialRecentMemos:[{id:'past',title:'虚构过期窗口',scheduledAt:new Date(Date.now()-5*86400000).toISOString(),completed:false},{id:'done',title:'虚构完成备忘',scheduledAt:new Date().toISOString(),completed:true}]})
 const sections=renderer.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-section']).map(n=>n.props['data-home-section'])
 assert.ok(!sections.includes('HEALTH'));assert.ok(!sections.includes('MEMOS'))
})
test('quick record counts zero through six have no placeholders and keep enabled actions',async t=>{
 for(const count of [0,1,2,3,4,6]){
  const methods=['BREAST_MILK','BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD','AD_VITAMIN','DIAPER'].slice(0,count)
  const {renderer}=await setup(t,defaults,defaults,{initialQuickRecordKeys:methods})
  const section=renderer.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-section']==='QUICK_RECORDS')
  assert.equal(section.length,count?1:0)
  if(count)assert.equal(section[0].findAllByType('button').length,count)
 }
})

test('a failed same-day refresh keeps last known values and offers retry instead of claiming zero records',async t=>{
 const {renderer}=await setup(t)
 const oldFetch=global.fetch,oldError=console.error
 t.after(()=>{global.fetch=oldFetch;console.error=oldError})
 console.error=()=>{}
 global.fetch=async url=>url.startsWith('/api/feeding')||url.startsWith('/api/health')?{ok:false}:oldFetch(url)
 await act(async()=>invalidateRecordRelatedCaches('test-baby'))
 assert.match(renderer.root.findByProps({role:'alert'}).children.join(''),/更新失败/)
 const feedingCard=renderer.root.find(n=>typeof n.type==='string'&&n.props['data-home-card']==='FEEDING')
 const read=n=>typeof n==='string'?n:(n.children||[]).map(read).join('')
 assert.match(read(feedingCard),/100ml/)
 assert.ok(renderer.root.findAll(n=>n.type==='button'&&n.props['aria-label']==='重新加载今日数据').length)
})

test('failed baby switches do not label discarded arrays as a previously loaded result',async t=>{
 const {renderer}=await setup(t)
 await act(async()=>invalidateRecordRelatedCaches('test-baby'))
 const oldFetch=global.fetch,oldError=console.error;t.after(()=>{global.fetch=oldFetch;console.error=oldError});console.error=()=>{}
 global.fetch=async url=>url.startsWith('/api/feeding')||url.startsWith('/api/health')?{ok:false}:oldFetch(url)
 const props={initialBabies:[{id:'test-baby',name:'虚构A',birthDate:'2026-06-01',gender:'FEMALE'},{id:'test-baby-b',name:'虚构B',birthDate:'2026-06-01',gender:'FEMALE'}],initialTodayRecords:[feeding(100)],initialTodayHealthRecords:[],initialHomepageSettings:defaults}
 await act(async()=>renderer.update(React.createElement(Dashboard,{...props,selectedBabyId:'test-baby-b'})))
 await act(async()=>renderer.update(React.createElement(Dashboard,{...props,selectedBabyId:'test-baby'})))
 assert.equal(renderer.root.findAll(n=>typeof n.type==='string'&&n.props['data-home-card']==='FEEDING').length,0)
 assert.ok(renderer.root.findByProps({role:'alert'}))
})

test('server-rendered homepage immediately uses the selected baby nutrition catalog',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server')
 const html=renderToStaticMarkup(React.createElement(Dashboard,{selectedBabyId:'catalog-baby',initialBabies:[{id:'catalog-baby',name:'虚构目录宝宝',birthDate:'2026-01-01',gender:'FEMALE',supplementSettings:JSON.stringify([{id:'DHA',name:'虚构单项补充',unit:'',enabled:true}])}],initialHomepageSettings:defaults,initialTodayRecords:[],initialTodayHealthRecords:[]}))
 assert.equal((html.match(/data-supplement-chip=/g)||[]).length,1)
 assert.ok(html.includes('虚构单项补充'))
})
