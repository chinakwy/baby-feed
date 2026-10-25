'use client'

import { Pill, ChevronRight } from 'lucide-react'
import type { SupplementDefinition, SupplementEntry } from '@/lib/supplements'
export default function HomepageSupplementSummary({definitions,entries,adGiven=false,vitaminDGiven=false,onRecord}:{definitions:SupplementDefinition[];entries:SupplementEntry[];adGiven?:boolean;vitaminDGiven?:boolean;onRecord:()=>void}) {
  const unique=[...new Map(entries.map(item=>[item.id,item])).values()]
  const items=[...definitions.filter(item=>item.enabled),...unique.filter(item=>!definitions.some(d=>d.id===item.id&&d.enabled))]
  const given=(id:string)=>unique.some(item=>item.id===id)||(id==='AD'&&adGiven)||(id==='VITAMIN_D'&&vitaminDGiven)
  return <button type="button" aria-label="记录营养补充" onClick={onRecord} data-home-card="AD_VITAMIN" className="flex w-full min-w-0 flex-wrap items-center gap-x-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-1.5 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
    <span className="flex min-h-11 shrink-0 items-center gap-1.5"><Pill size={20} className="shrink-0 text-orange-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">营养补充</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></span>
    <span className="flex min-h-7 min-w-0 flex-[1_1_8rem] flex-wrap items-center gap-x-1.5">
      {items.map(item=><span key={item.id} className="flex min-h-11 max-w-full min-w-0 items-center"><span data-supplement-chip={item.id} data-given={given(item.id)} title={`${item.name} ${given(item.id)?'已补充':'未补充'}`} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg bg-slate-50/80 px-1.5 py-1 text-xs leading-5 text-slate-700"><span className="min-w-0 whitespace-normal break-all">{item.name}</span><span className={`shrink-0 ${given(item.id)?'text-emerald-600':'text-slate-400'}`}>{given(item.id)?'✓':'○'}</span></span></span>)}
      {!items.length&&<span className="text-xs text-slate-400">暂无补充项目</span>}
    </span>
  </button>
}
