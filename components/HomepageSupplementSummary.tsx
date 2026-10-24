'use client'

import { useEffect, useRef, useState } from 'react'
import { Pill, ChevronRight, X } from 'lucide-react'
import type { SupplementDefinition, SupplementEntry } from '@/lib/supplements'
import AdaptiveDialog from '@/components/AdaptiveDialog'
export function getSupplementVisibleCount(width:number,count:number) {
  if (!count) return 0
  const max=Math.min(3,count)
  if(count<=3 && count*56+Math.max(0,count-1)*6<=width)return count
  return Math.max(1,Math.min(max,Math.floor((width-44)/62)))
}
export default function HomepageSupplementSummary({definitions,entries,adGiven=false,vitaminDGiven=false,onRecord}:{definitions:SupplementDefinition[];entries:SupplementEntry[];adGiven?:boolean;vitaminDGiven?:boolean;onRecord:()=>void}) {
  const [expanded,setExpanded]=useState(false)
  const [width,setWidth]=useState<number|null>(null)
  const tagsRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const target=tagsRef.current
    if(!target)return
    const measure=()=>{const next=target.getBoundingClientRect().width;if(next>0)setWidth(next)}
    measure()
    if(typeof ResizeObserver==='undefined')return
    const observer=new ResizeObserver(measure);observer.observe(target)
    return ()=>observer.disconnect()
  },[])
  const unique=[...new Map(entries.map(item=>[item.id,item])).values()]
  const items=[...definitions.filter(item=>item.enabled),...unique.filter(item=>!definitions.some(d=>d.id===item.id&&d.enabled))]
  const visibleCount=width===null?Math.min(3,items.length):getSupplementVisibleCount(width,items.length)
  const given=(id:string)=>unique.some(item=>item.id===id)||(id==='AD'&&adGiven)||(id==='VITAMIN_D'&&vitaminDGiven)
  return <div data-home-card="AD_VITAMIN" className="min-w-0 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
    <button type="button" aria-label="记录营养补充" onClick={onRecord} className="flex min-h-11 w-full min-w-0 items-center gap-1.5 bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Pill size={20} className="shrink-0 text-orange-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">营养补充</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></button>
    <div ref={tagsRef} className="mt-1 flex min-h-7 min-w-0 items-center gap-1.5">
      {items.slice(0,visibleCount).map(item=><button key={item.id} type="button" aria-label={'查看营养项目'+item.name} onClick={()=>setExpanded(true)} className="min-h-11 min-w-0 flex-1 bg-transparent text-left"><span data-supplement-chip={item.id} data-given={given(item.id)} title={`${item.name} ${given(item.id)?'已补充':'未补充'}`} className="inline-flex w-full min-w-0 items-center gap-1 rounded-lg bg-slate-50/80 px-1.5 py-1 text-xs leading-5 text-slate-700"><span className="min-w-0 truncate">{item.name}</span><span className={`shrink-0 ${given(item.id)?'text-emerald-600':'text-slate-400'}`}>{given(item.id)?'✓':'○'}</span></span></button>)}
      {items.length>visibleCount&&<button type="button" aria-label="查看全部营养补充项目" onClick={()=>setExpanded(true)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-50/80 px-2 text-xs font-semibold text-slate-600">+{items.length-visibleCount}</button>}
      {!items.length&&<span className="text-xs text-slate-400">暂无补充项目</span>}
    </div>
    {expanded&&<AdaptiveDialog labelledBy="supplements-today-title" onDismiss={()=>setExpanded(false)} maxWidthClassName="sm:max-w-sm"><div className="space-y-4 p-4"><header className="flex items-center justify-between"><h2 id="supplements-today-title" className="font-semibold">今日营养补充</h2><button type="button" aria-label="关闭营养补充列表" onClick={()=>setExpanded(false)} className="mobile-touch-target flex items-center justify-center"><X size={20}/></button></header><div className="max-h-[55dvh] space-y-2 overflow-y-auto">{items.map(item=><div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="min-w-0 break-all">{item.name}</span><span className={`shrink-0 ${given(item.id)?'text-emerald-600':'text-slate-400'}`}>{given(item.id)?'已补充 ✓':'未补充 ○'}</span></div>)}</div><button type="button" onClick={()=>{setExpanded(false);onRecord()}} className="min-h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white">记录营养补充</button></div></AdaptiveDialog>}
  </div>
}
