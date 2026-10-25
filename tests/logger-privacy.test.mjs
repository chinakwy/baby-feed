import test from 'node:test'
import assert from 'node:assert/strict'
import load from './helpers/load-component.cjs'
const {logError}=load('lib/logger.ts')
test('production ORM and unknown error messages cannot leak record bodies or credentials',()=>{
 const env=process.env.NODE_ENV,original=console.error,lines=[]
 process.env.NODE_ENV='production';console.error=(...args)=>lines.push(args.join(' '))
 try {logError('Webhook emit failed',new Error('secret fictional-baby payload'));logError('Webhook emit failed',{payload:'secret'})}
 finally {console.error=original;if(env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env}
 assert.equal(lines.length,2);assert.ok(lines.every(line=>line.includes('Webhook emit failed')));assert.ok(lines.every(line=>!line.includes('secret')&&!line.includes('payload')))
})
