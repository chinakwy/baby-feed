import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import load from './helpers/load-component.cjs'
let avatar={};try{avatar=load('lib/avatar.ts')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}
test('avatar decodes and re-encodes only a bounded raster image without metadata',async()=>{
 assert.equal(typeof avatar.normalizeAvatar,'function')
 const original=await sharp({create:{width:800,height:400,channels:3,background:'#ffccdd'}}).jpeg().toBuffer()
 const result=await avatar.normalizeAvatar('data:image/jpeg;base64,'+original.toString('base64'))
 const info=await sharp(Buffer.from(result.split(',')[1],'base64')).metadata()
 assert.equal(info.width,512);assert.equal(info.height,512);assert.equal(info.format,'jpeg');assert.equal(info.exif,undefined)
 for(const value of ['data:image/svg+xml;base64,AAAA','https://external.invalid/avatar.jpg','data:image/jpeg;base64,AAAA','x'.repeat(600001)])await assert.rejects(()=>avatar.normalizeAvatar(value))
})
test('avatar request streaming limit cannot be bypassed by missing content length',async()=>{
 assert.equal(typeof avatar.readAvatarBody,'function')
 const body=JSON.stringify({image:'x'.repeat(600001)})
 await assert.rejects(()=>avatar.readAvatarBody(new Request('http://localhost',{method:'PUT',body})))
})
