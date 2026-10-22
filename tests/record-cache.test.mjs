import test from 'node:test'
import assert from 'node:assert/strict'
import load from './helpers/load-component.cjs'
const { invalidateRecordRelatedCaches } = load('lib/cache-helpers.ts')
const { dedupeRequest, invalidateRequestCache } = load('lib/client-request-cache.ts')

test('record mutations invalidate this baby timeline and stats, preserving other baby cache', async () => {
  invalidateRequestCache()
  const keys = ['timeline:baby-one:2026-10-22', 'timeline-dates:baby-one', 'stats:baby-one:days=7', 'stats:baby-two:days=7']
  for (const key of keys) await dedupeRequest(key, async () => 'old', 60000)
  invalidateRecordRelatedCaches('baby-one')
  const results = await Promise.all(keys.map(key => dedupeRequest(key, async () => 'new', 60000)))
  assert.deepEqual(results, ['new', 'new', 'new', 'old'])
  invalidateRequestCache()
})

test('blocked session storage cannot turn a successful database mutation into a UI failure', () => {
  const previous = global.window
  global.window = { sessionStorage: { setItem() { throw new Error('Storage disabled') } } }
  try { assert.doesNotThrow(() => invalidateRecordRelatedCaches('baby-one')) }
  finally { global.window = previous }
})
