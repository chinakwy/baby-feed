'use client'
import { useEffect, useState } from 'react'
import { type SupplementDefinition } from '@/lib/supplements'
export default function SupplementSettings({embedded=false}: {embedded?:boolean}) {
  const [babies,setBabies]=useState<{id:string;name:string}[]>([])
  const [babyId,setBabyId]=useState('')
  const [definitions,setDefinitions]=useState<SupplementDefinition[]>([])
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [loadedBaby,setLoadedBaby]=useState('')
  const [version,setVersion]=useState('')
  const [reload,setReload]=useState(0)
  useEffect(()=>{let cancelled=false;fetch('/api/babies').then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    if(cancelled || !Array.isArray(data)) return
    setBabies(data)
    const query=new URLSearchParams(window.location.search).get('babyId')
    setBabyId(data.some(b=>b.id===query)?query:data[0]?.id||'')
  }).catch(()=>setMessage('读取宝宝列表失败'));return()=>{cancelled=true}},[])
  useEffect(()=>{
    if(!babyId)return
    let cancelled=false
    setLoadedBaby('');setMessage('')
    fetch(`/api/babies/${encodeURIComponent(babyId)}/supplements`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(!cancelled){setDefinitions(data.definitions);setVersion(data.version);setLoadedBaby(babyId)}}).catch(()=>{if(!cancelled)setMessage('读取失败，请重试')})
    return()=>{cancelled=true}
  },[babyId,reload])
  const update=(id:string,patch:Partial<SupplementDefinition>)=>setDefinitions(items=>items.map(x=>x.id===id?{...x,...patch}:x))
  const save=async()=>{
    setBusy(true);setMessage('')
    try {
      const response=await fetch(`/api/babies/${encodeURIComponent(babyId)}/supplements`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({definitions,version})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'保存失败')
      setDefinitions(data.definitions);setVersion(data.version);setMessage('已保存')
    }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
  }
  return <section className={embedded ? "space-y-4" : "mx-auto max-w-lg space-y-5 p-4 pb-24"}>{!embedded && <a href="/settings/homepage" className="text-blue-700">‹ 首页展示管理</a>}{!embedded && <h2 className="text-lg font-bold">营养补充项目管理</h2>}<p className="text-sm text-slate-600">按宝宝设置常用项目。修改名称、单位或停用，不会改写历史记录；默认单位为空。</p>
    <label className="block">宝宝<select aria-label="宝宝" value={babyId} disabled={busy} onChange={e=>setBabyId(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border p-3">{babies.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    {loadedBaby===babyId && babyId?<><div className="space-y-3">{definitions.map(def=><div key={def.id} className="space-y-2 rounded-xl border bg-white p-3"><label className="block text-sm">项目名称<input disabled={busy} aria-label={`${def.id} 名称`} value={def.name} maxLength={40} onChange={e=>update(def.id,{name:e.target.value})} className="mt-1 min-h-11 w-full rounded-lg border p-2"/></label><label className="block text-sm">常用单位（可选）<input disabled={busy} aria-label={`${def.id} 单位`} value={def.unit} maxLength={12} onChange={e=>update(def.id,{unit:e.target.value})} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></label><label className="flex min-h-10 items-center gap-2"><input disabled={busy} type="checkbox" checked={def.enabled} onChange={e=>update(def.id,{enabled:e.target.checked})}/>启用项目</label></div>)}</div>
    <button disabled={definitions.length>=30||busy} onClick={()=>setDefinitions(x=>[...x,{id:crypto.randomUUID(),name:'',unit:'',enabled:true}])} className="min-h-12 rounded-xl border px-4 disabled:opacity-40">添加项目</button>
    <button disabled={busy} onClick={save} className="ml-3 min-h-12 rounded-xl bg-blue-600 px-6 text-white disabled:opacity-40">{busy?'保存中…':'保存营养项目'}</button></>:null}
    <button disabled={busy} onClick={()=>setReload(x=>x+1)} className="block min-h-11 text-sm text-blue-700">重新加载设置</button>
    <p role="status" className="text-sm text-slate-700">{message}</p>
  </section>
}
