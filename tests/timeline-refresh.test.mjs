import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Timeline = load('components/Timeline.tsx').default
const Menu = load('components/RecordActionMenu.tsx').default
const Editor = load('components/TimelineEditRecordModal.tsx').default
const { invalidateRequestCache } = load('lib/client-request-cache.ts')
const { act } = TestRenderer
const date = '2026-10-22'
const makeRecord = (id, amount) => ({ id, babyId: 'test-baby', type: 'FORMULA', formulaAmount: amount,
  startTime: `${date}T08:00:00+08:00`, createdAt: `${date}T08:00:00+08:00`, recordType: 'feeding' })

for (const operation of ['edit', 'delete', 'delete-last', 'failed-delete']) {
  test(`timeline ${operation}: immediately reflects server result without re-entering the page`, async t => {
    invalidateRequestCache()
    const oldWindow = global.window, oldDocument = global.document, oldFetch = global.fetch, oldAlert = global.alert
    global.alert = () => {}
    global.window = Object.assign(new EventTarget(), {
      sessionStorage: { getItem: () => null, setItem() {} },
      requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout,
    })
    global.document = Object.assign(new EventTarget(), { body: { style: {} }, querySelector: () => null })
    let records = operation === 'delete-last' ? [makeRecord('first', 100)] : [makeRecord('first', 100), makeRecord('second', 50)]
    global.fetch = async (input, options = {}) => {
      const url = new URL(input, 'http://localhost')
      if (options.method === 'PUT') {
        records = records.map(r => r.id === 'first' ? { ...r, ...JSON.parse(options.body) } : r)
      } else if (options.method === 'DELETE') {
        if (operation === 'failed-delete') return { ok: false, json: async () => ({ error: '删除失败' }) }
        records = records.filter(r => r.id !== 'first')
      }
      return { ok: true, json: async () => url.pathname === '/api/timeline-dates' ? (records.length ? [date] : []) :
        url.pathname === '/api/feeding' ? records : url.pathname === '/api/health' ? [] : { success: true } }
    }
    let renderer
    t.after(() => {
      if (renderer) act(() => renderer.unmount())
      global.window = oldWindow; global.document = oldDocument; global.fetch = oldFetch; global.alert = oldAlert
      invalidateRequestCache()
    })
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(Timeline, {
        selectedBabyId: 'test-baby', onSelectBaby() {}, initialBabies: [{ id: 'test-baby', name: '虚构测试宝宝' }],
        initialSelectedBabyId: 'test-baby', initialDate: date, initialValidDates: [date], initialRecords: records,
      }))
    })
    const text = () => JSON.stringify(renderer.toJSON())
    assert.match(text(), /奶粉喂养 100ml/)
    const firstMenu = () => renderer.root.findAllByType(Menu).find(n => n.props.ariaLabel.includes('100ml'))
    if (operation === 'edit') {
      await act(async () => firstMenu().props.onEdit())
      await act(async () => renderer.root.findByType(Editor).props.onSave({ type: 'FORMULA', formulaAmount: 120, startTime: `${date}T08:00:00+08:00` }))
      assert.match(text(), /奶粉喂养 120ml/)
      assert.doesNotMatch(text(), /奶粉喂养 100ml/)
      assert.ok(renderer.root.findAll(n => n.type === 'p' && n.children.join('') === '170').length, 'daily total updates to 170ml')
    } else {
      await act(async () => firstMenu().props.onDelete())
      const confirm = renderer.root.findAllByType('button').find(n => n.children.join('') === '删除')
      assert.ok(confirm, 'delete confirmation is visible')
      await act(async () => confirm.props.onClick())
      if (operation === 'failed-delete') {
        assert.match(text(), /奶粉喂养 100ml/)
      } else {
        assert.doesNotMatch(text(), /奶粉喂养 100ml/)
        if (operation === 'delete') assert.match(text(), /奶粉喂养 50ml/)
        else assert.equal(renderer.root.findAllByType(Menu).length, 0)
      }
    }
  })
}
