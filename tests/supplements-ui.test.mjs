import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const load=require('./helpers/load-component.cjs')
const React=require('react')
const {create,act}=require('react-test-renderer')
test('nutrition field offers DHA and emits optional amount and unit without dosage defaults', async()=>{
 const {default:Fields}=load('components/SupplementFields.tsx')
 let current=[]
 let renderer
 await act(async()=>{renderer=create(React.createElement(Fields,{entries:[],onChange:value=>{current=value}}))})
 const dha=renderer.root.findAllByType('input').find(x=>x.props['aria-label']==='补充 DHA')
 assert.ok(dha)
 await act(async()=>dha.props.onChange({target:{checked:true}}))
 assert.deepEqual(current,[{id:'DHA',name:'DHA'}])
 await act(async()=>renderer.update(React.createElement(Fields,{entries:current,onChange:value=>{current=value}})))
 const amount=renderer.root.findAllByType('input').find(x=>x.props['aria-label']==='DHA 数量')
 assert.equal(amount.props.value,'')
 await act(async()=>amount.props.onChange({target:{value:'2'}}))
 assert.equal(current[0].amount,'2')
})
test('catalog fetch failure blocks selection until retry loads the owned catalog',async t=>{
 const {default:Fields}=load('components/SupplementFields.tsx')
 const originalFetch=global.fetch
 let fail=true
 global.fetch=async()=>{if(fail)throw new Error('offline');return {ok:true,json:async()=>({definitions:[{id:'DHA',name:'DHA',unit:'',enabled:true}]})}}
 let renderer
 t.after(()=>{act(()=>renderer?.unmount());global.fetch=originalFetch})
 await act(async()=>{renderer=create(React.createElement(Fields,{babyId:'fictional-baby',entries:[],onChange(){}}))})
 assert.equal(renderer.root.findByType('fieldset').props.disabled,true)
 assert.equal(renderer.root.findAllByProps({role:'alert'}).length,1)
 const retry=renderer.root.findAllByType('button').find(x=>x.children.join('')==='重试')
 assert.ok(retry)
 fail=false
 await act(async()=>retry.props.onClick())
 assert.equal(renderer.root.findByType('fieldset').props.disabled,false)
})
