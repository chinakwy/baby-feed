import test from 'node:test'
import assert from 'node:assert/strict'
import load from './helpers/load-component.cjs'
const {isPublicWebhookAddress,postWebhook}=load('lib/webhook-transport.ts')
test('webhook blocks special IPv4, IPv6, mapped and alternate loopback forms',async()=>{
 for(const address of ['127.0.0.1','0.1.2.3','10.0.0.1','100.64.0.1','169.254.169.254','192.168.1.1','172.31.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fc01::1','fe80::1','2001:db8::1','2002:7f00:1::']) assert.equal(isPublicWebhookAddress(address),false,address)
 for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111']) assert.equal(isPublicWebhookAddress(address),true,address)
 for(const target of ['http://127.1/','http://2130706433/','http://[::1]/','http://localhost/','https://user:secret@example.com/']) await assert.rejects(postWebhook(target,'{}',{}))
})
