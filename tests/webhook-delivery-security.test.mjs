import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'
import crypto from 'node:crypto'
import {EventEmitter} from 'node:events'
import load from './helpers/load-component.cjs'
const original=Module._load
let answers=[{address:'8.8.8.8',family:4}], requests=0, code=302, last
const transport={request(url,options,callback){
 requests++;last={url,options}
 const request=new EventEmitter()
 request.end=body=>{last.body=body;options.lookup('example.test',{},(err,address,family)=>{assert.equal(address,'8.8.8.8');assert.equal(family,4)});const response={statusCode:code,destroy(){}};callback(response);request.emit('close')}
 request.destroy=error=>{request.emit('error',error);request.emit('close')}
 return request
}}
Module._load=function(name,...args){
 if(name==='node:dns/promises')return {lookup:async()=>answers}
 if(name==='node:https'||name==='node:http')return transport
 if(name==='./prisma')return {prisma:{}}
 if(name==='./reminder-rescheduler')return {getIntervalSourceSnapshot(){}}
 return original.call(this,name,...args)
}
const {postWebhook}=load('lib/webhook-transport.ts')
const {sendWebhookDelivery}=load('lib/webhook-runner.ts')
Module._load=original

test('DNS mixed answers reject before transport; redirects never result in a second request',async()=>{
 answers=[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]
 await assert.rejects(postWebhook('https://example.test/hook','{}',{}));assert.equal(requests,0)
 answers=[{address:'8.8.8.8',family:4}]
 assert.equal(await postWebhook('https://example.test/hook','{}',{}),302);assert.equal(requests,1)
})
test('delivery signs exact UTF8 bytes, preserves IDs and classifies non-2xx for retry',async()=>{
 const payload=JSON.stringify({id:'event-one',type:'feeding.created',data:{notes:'模拟'}})
 code=503
 const failure=await sendWebhookDelivery(payload,'feeding.created','event-one','delivery-one',{url:'https://example.test/hook',secret:'fictional-secret'})
 assert.equal(failure.success,false);assert.equal(failure.httpStatus,503)
 assert.equal(last.options.headers['X-Webhook-Signature'],crypto.createHmac('sha256','fictional-secret').update(payload).digest('hex'))
 assert.equal(last.options.headers['Content-Length'],String(Buffer.byteLength(payload)))
 const first=last.options.headers;code=204
 assert.equal((await sendWebhookDelivery(payload,'feeding.created','event-one','delivery-one',{url:'https://example.test/hook',secret:'fictional-secret'})).success,true)
 assert.equal(last.options.headers['X-Webhook-Event-ID'],first['X-Webhook-Event-ID']);assert.equal(last.options.headers['X-Webhook-Delivery-ID'],first['X-Webhook-Delivery-ID'])
 const before=requests
 assert.equal((await sendWebhookDelivery('中'.repeat(40000),'x','x','x',{url:'https://example.test/hook',secret:'s'})).success,false);assert.equal(requests,before)
})
