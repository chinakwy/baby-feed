import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const Trash = load('app/trash/page.tsx').default
const { act } = TestRenderer
for (const success of [true, false]) {
  test(`recycle bin ${success ? 'restores and removes row' : 'retains row and reports restore conflict'}`, async t => {
    const oldFetch = global.fetch
    const item = { id: 'test-archive', babyId: 'test-baby', kind: 'feeding', deletedAt: '2026-10-22T01:00:00Z',
      baby: { name: '虚构测试宝宝' }, record: { id: 'test-record', type: 'FORMULA', formulaAmount: 123, startTime: '2026-10-21T23:00:00Z' } }
    let request
    global.fetch = async (url, options = {}) => {
      if (options.method === 'POST') {
        request = url
        return { ok: success, json: async () => success ? { success: true } : { error: '记录冲突，副本保留' } }
      }
      return { ok: true, json: async () => [item] }
    }
    let renderer
    t.after(() => { if (renderer) act(() => renderer.unmount()); global.fetch = oldFetch })
    await act(async () => { renderer = TestRenderer.create(React.createElement(Trash)) })
    assert.ok(renderer.root.findAllByType('li').length === 1)
    await act(async () => renderer.root.findAllByType('button').find(n => n.children.join('') === '恢复记录').props.onClick())
    assert.equal(request, '/api/trash/test-archive/restore')
    if (success) {
      assert.equal(renderer.root.findAllByType('li').length, 0)
      assert.ok(renderer.root.findByProps({ role: 'status' }))
    } else {
      assert.equal(renderer.root.findAllByType('li').length, 1)
      assert.equal(renderer.root.findByProps({ role: 'alert' }).children.join(''), '记录冲突，副本保留')
    }
  })
}
