import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const { act } = TestRenderer
let Manager
try { Manager = load('components/HomepageSettings.tsx').default } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }
const original = { sections: ['BABY','SUMMARY','MEMOS','HEALTH','QUICK_RECORDS','TODAY_RECORDS'], cards: ['FEEDING','AD_VITAMIN','DIAPER','SLEEP'] }
for (const success of [true, false]) {
  test(`homepage manager ${success ? 'saves visibility with fixed card order' : 'keeps unsaved edits when save fails'}`, async t => {
    assert.equal(typeof Manager, 'function', 'homepage display management is required')
    const oldFetch = global.fetch, oldSelf = global.self
    global.self = { setTimeout, clearTimeout }
    let submitted
    global.fetch = async (url, options = {}) => {
      assert.equal(url, '/api/user/homepage')
      if (options.method === 'PUT') {
        submitted = JSON.parse(options.body)
        return { ok: success, json: async () => success ? submitted : { error: '模拟保存失败' } }
      }
      return { ok: true, json: async () => original }
    }
    let renderer
    t.after(() => { if (renderer) act(() => renderer.unmount()); global.fetch = oldFetch; global.self = oldSelf })
    await act(async () => { renderer = TestRenderer.create(React.createElement(Manager, { onBack() {} })) })
    const checkbox = label => renderer.root.find(n => n.type === 'input' && n.props['aria-label'] === label)
    assert.equal(renderer.root.findAll(n => n.type === 'input' && n.props['aria-label'] === '显示近期备忘').length,0)
    await act(async () => checkbox('显示母乳亲喂').props.onChange())
    assert.equal(renderer.root.findAll(n => n.type === 'button' && n.props['aria-label'] === '上移睡眠').length,0)
    await act(async () => checkbox('显示睡眠').props.onChange())
    await act(async () => renderer.root.findAllByType('button').find(n => n.children.includes('保存')).props.onClick())
    assert.deepEqual(submitted, { sections: original.sections, cards: ['FEEDING','AD_VITAMIN','DIAPER'], feedingTypes: ['BREAST_MILK_BOTTLE','FORMULA','SOLID_FOOD'] })
    assert.equal(checkbox('显示母乳亲喂').props.checked, false)
    if (success) assert.ok(renderer.root.findByProps({ role: 'status' }))
    else {
      assert.match(renderer.root.findByProps({ role: 'alert' }).children.join(''), /模拟保存失败/)
      assert.equal(renderer.root.findAllByType('button').find(n => n.children.includes('保存')).props.disabled, false)
    }
  })
}
