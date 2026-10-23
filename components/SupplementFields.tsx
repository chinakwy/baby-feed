'use client'
import { useEffect, useState } from 'react'
import { DEFAULT_SUPPLEMENTS, getVisibleSupplements, validateSupplementDefinitions, type SupplementDefinition, type SupplementEntry } from '@/lib/supplements'
export default function SupplementFields({babyId,entries,onChange}: {babyId?:string;entries:SupplementEntry[];onChange:(entries:SupplementEntry[])=>void}) {
  const [catalog,setCatalog]=useState<SupplementDefinition[]>(DEFAULT_SUPPLEMENTS)
  const [loadedBaby,setLoadedBaby]=useState('')
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)
  const ready=!babyId || loadedBaby===babyId
  useEffect(()=>{
    setCatalog(DEFAULT_SUPPLEMENTS)
    setLoadedBaby('');setError('')
    if (!babyId) return
    let cancelled=false
    fetch(`/api/babies/${encodeURIComponent(babyId)}/supplements`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
      const definitions=validateSupplementDefinitions(data?.definitions)
      if(!cancelled){setCatalog(definitions);setLoadedBaby(babyId)}
    }).catch(()=>{if(!cancelled)setError('读取补充项目失败，请重试')})
    return ()=>{cancelled=true}
  },[babyId,retry])
  const visible=getVisibleSupplements(catalog,entries)
  const update=(id:string,patch:Partial<SupplementEntry>)=>onChange(entries.map(x=>x.id===id?{...x,...patch}:x))
  return <div><fieldset disabled={!ready} className="space-y-3"><legend className="mb-2 text-sm font-medium text-slate-700">本次营养补充</legend>
    {visible.map(def=>{const entry=entries.find(x=>x.id===def.id);return <div key={def.id} className="rounded-xl border border-slate-200 p-3">
      <label className="flex min-h-10 items-center gap-3"><input type="checkbox" aria-label={`补充 ${def.name}`} checked={!!entry} onChange={event=>onChange(event.target.checked?[...entries,{id:def.id,name:def.name,...(def.unit?{unit:def.unit}:{})}]:entries.filter(x=>x.id!==def.id))}/><span>{def.name}</span></label>
      {entry?<div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-600">数量（可选）<input aria-label={`${entry.name} 数量`} type="text" inputMode="decimal" maxLength={16} value={entry.amount||''} onChange={e=>update(entry.id,{amount:e.target.value})} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></label><label className="text-xs text-slate-600">单位{entry.amount?'（必填）':'（可选）'}<input aria-label={`${entry.name} 单位`} maxLength={12} value={entry.unit||''} onChange={e=>update(entry.id,{unit:e.target.value})} className="mt-1 min-h-11 w-full rounded-lg border p-2" /></label></div>:null}
    </div>})}
    </fieldset>
    {!ready ? error ? <div><p role="alert" className="text-sm text-red-600">{error}</p><button type="button" onClick={()=>setRetry(x=>x+1)} className="min-h-11 text-blue-700">重试</button></div> : <p role="status" className="text-sm text-slate-500">读取补充项目中…</p> : null}
    <p className="text-xs text-slate-500">可在设置的“首页展示管理”中调整补充项目。</p>
    <p className="text-xs text-slate-500">仅记录实际补充情况；数量和单位由你填写。</p>
  </div>
}
