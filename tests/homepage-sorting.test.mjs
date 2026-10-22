import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import load from './helpers/load-component.cjs'
const List = load('components/HomeVisibilityList.tsx').default
const { act } = TestRenderer

test('touch/pointer sorting reorders the enabled rows using only its own list', async t => {
  const previous = global.window
  global.window = Object.assign(new EventTarget(), { requestAnimationFrame: () => 1, cancelAnimationFrame() {}, innerHeight: 800, scrollBy() {} })
  let order = ['A','B','C']
  const items = [{ key: 'A', label: '甲' }, { key: 'B', label: '乙' }, { key: 'C', label: '丙' }]
  function Wrapper() {
    const [keys, setKeys] = React.useState(order)
    return React.createElement(List, { title: '排序测试', items, value: keys, onChange: value => { order = value; setKeys(value) } })
  }
  let renderer
  t.after(() => { if (renderer) act(() => renderer.unmount()); global.window = previous })
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Wrapper), { createNodeMock: element => element.type === 'div' ? {
      querySelectorAll: () => order.map((key, index) => ({ dataset: { homeSortKey: key }, getBoundingClientRect: () => ({ top: index*64, height: 64 }) })),
    } : null })
  })
  const handle = renderer.root.find(n => n.type === 'button' && n.props['aria-label'] === '拖动调整乙顺序')
  await act(async () => handle.props.onPointerDown({ isPrimary: true, button: 0, pointerId: 7, clientY: 96, preventDefault() {} }))
  const move = new Event('pointermove', { cancelable: true })
  Object.assign(move, { pointerId: 7, clientY: 10 })
  await act(async () => window.dispatchEvent(move))
  assert.deepEqual(order, ['B','A','C'])
  assert.deepEqual(renderer.root.findAll(n => n.type === 'div' && n.props['data-home-sort-key']).map(n => n.props['data-home-sort-key']), ['B','A','C'])
  const end = new Event('pointerup'); Object.assign(end, { pointerId: 7 })
  await act(async () => window.dispatchEvent(end))
  assert.equal(handle.props['aria-grabbed'], false)
})
