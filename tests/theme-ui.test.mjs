import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import TestRenderer from 'react-test-renderer'
import Module from 'node:module'
import load from './helpers/load-component.cjs'
const {act}=TestRenderer
let theme='blue',saving=false,fail=false,calls=[]
const old=Module._load
Module._load=function(name,...args){
 if(name==='@/components/ThemeProvider')return {useTheme:()=>({theme,loading:false,saving,setTheme:async next=>{calls.push(next);if(fail)throw new Error('保存失败');theme=next}})}
 return old.call(this,name,...args)
}
let Settings
try{Settings=load('components/ThemeSettings.tsx').default}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}finally{Module._load=old}
test('theme settings exposes named choices and saves the selected color',async()=>{
 assert.equal(typeof Settings,'function')
 theme='blue';calls=[];fail=false
 let r;await act(async()=>{r=TestRenderer.create(React.createElement(Settings,{onBack(){}}))})
 try{
  const choices=r.root.findAll(n=>n.type==='button'&&n.props.role==='radio')
  assert.equal(choices.length,4)
  assert.ok(choices.some(n=>n.props['aria-label']==='西米粉'))
  await act(async()=>choices.find(n=>n.props['aria-label']==='西米粉').props.onClick())
  assert.deepEqual(calls,['pink'])
 }finally{r.unmount()}
})
test('theme settings reports save failure and disables choices while saving',async()=>{
 assert.equal(typeof Settings,'function');fail=true;saving=false
 let r;await act(async()=>{r=TestRenderer.create(React.createElement(Settings,{onBack(){}}))})
 try{
  await act(async()=>r.root.find(n=>n.type==='button'&&n.props['aria-label']==='西米粉').props.onClick())
  assert.ok(JSON.stringify(r.toJSON()).includes('保存失败'))
  saving=true;act(()=>r.update(React.createElement(Settings,{onBack(){}})))
  assert.ok(r.root.findAll(n=>n.type==='button'&&n.props.role==='radio').every(n=>n.props.disabled))
 }finally{r.unmount();saving=false;fail=false}
})
