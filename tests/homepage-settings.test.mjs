import test from 'node:test'
import assert from 'node:assert/strict'
import load from './helpers/load-component.cjs'
let settings = {}
try { settings = load('lib/homepage-settings.ts') } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }
const expected = { sections: ['BABY','SUMMARY','HEALTH','MEMOS','QUICK_RECORDS','TODAY_RECORDS'], cards: ['BREAST_MILK','FORMULA','AD_VITAMIN','DIAPER'] }

test('missing or corrupt preferences preserve the existing homepage by default', () => {
  assert.equal(typeof settings.parseHomepageSettings, 'function', 'homepage preferences parser is required')
  for (const value of [null,'invalid-json','{"sections":["UNKNOWN"],"cards":[]}']) assert.deepEqual(settings.parseHomepageSettings(value), expected)
})
test('valid custom ordering and an intentionally empty homepage survive serialization', () => {
  assert.equal(typeof settings.parseHomepageSettings, 'function')
  for (const value of [{ sections: ['TODAY_RECORDS','SUMMARY'], cards: ['FORMULA','DIAPER'] }, { sections: [], cards: [] }]) {
    assert.deepEqual(settings.parseHomepageSettings(JSON.stringify(value)), value)
  }
})
test('server validation rejects unsupported keys, duplicates and non-array preferences', () => {
  assert.equal(typeof settings.validateHomepageSettings, 'function')
  for (const value of [null,[], { sections: 'SUMMARY', cards: [] }, { sections: ['SUMMARY','SUMMARY'], cards: [] }, { sections: ['PRIVATE'], cards: [] }, { sections: [], cards: ['FORMULA','FORMULA'] }]) {
    assert.equal(typeof settings.validateHomepageSettings(value), 'string')
  }
  assert.equal(settings.validateHomepageSettings(expected), null)
  assert.equal(settings.validateHomepageSettings({ sections: [], cards: [] }), null)
})
