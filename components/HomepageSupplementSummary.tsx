'use client'

import { useState } from 'react'
import { Pill, ChevronRight, X } from 'lucide-react'
import type { SupplementDefinition, SupplementEntry } from '@/lib/supplements'
import AdaptiveDialog from '@/components/AdaptiveDialog'
export default function HomepageSupplementSummary({definitions,entries,adGiven=false,vitaminDGiven=false,onRecord}:{definitions:SupplementDefinition[];entries:SupplementEntry[];adGiven?:boolean;vitaminDGiven?:boolean;onRecord:()=>void}) {
  const [expanded,setExpanded]=useState(false)
  const unique=[...new Map(entries.map(item=>[item.id,item])).values()]
  const items=[...definitions.filter(item=>item.enabled),...unique.filter(item=>!definitions.some(d=>d.id===item.id&&d.enabled))]
  const given=(id:string)=>unique.some(item=>item.id===id)||(id==='AD'&&adGiven)||(id==='VITAMIN_D'&&vitaminDGiven)
  return <div data-home-card="AD_VITAMIN" className="flex min-w-0 flex-wrap items-center gap-x-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-1.5 shadow-sm">
    <button type="button" aria-label="记录营养补充" onClick={onRecord} className="flex min-h-11 shrink-0 items-center gap-1.5 bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Pill size={20} className="shrink-0 text-orange-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">营养补充</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></button>
    <div className="flex min-h-7 min-w-0 flex-[1_1_8rem] flex-wrap items-center gap-x-1.5">
      {items.map(item=><button key={item.id} type="button" aria-label={'查看营养项目'+item.name} onClick={()=>setExpanded(true)} className="min-h-11 max-w-full min-w-0 bg-transparent text-left"><span data-supplement-chip={item.id} data-given={given(item.id)} title={`${item.name} ${given(item.id)?'已补充':'未补充'}`} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg bg-slate-50/80 px-1.5 py-1 text-xs leading-5 text-slate-700"><span className="min-w-0 whitespace-normal break-all">{item.name}</span><span className={`shrink-0 ${given(item.id)?'text-emerald-600':'text-slate-400'}`}>{given(item.id)?'✓':'○'}</span></span></button>)}
      {!items.length&&<span className="text-xs text-slate-400">暂无补充项目</span>}
    </div>
    {expanded&&<AdaptiveDialog labelledBy="supplements-today-title" onDismiss={()=>setExpanded(false)} maxWidthClassName="sm:max-w-sm"><div className="space-y-4 p-4"><header className="flex items-center justify-between"><h2 id="supplements-today-title" className="font-semibold">今日营养补充</h2><button type="button" aria-label="关闭营养补充列表" onClick={()=>setExpanded(false)} className="mobile-touch-target flex items-center justify-center"><X size={20}/></button></header><div className="max-h-[55dvh] space-y-2 overflow-y-auto">{items.map(item=><div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="min-w-0 break-all">{item.name}</span><span className={`shrink-0 ${given(item.id)?'text-emerald-600':'text-slate-400'}`}>{given(item.id)?'已补充 ✓':'未补充 ○'}</span></div>)}</div><button type="button" onClick={()=>{setExpanded(false);onRecord()}} className="min-h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white">记录营养补充</button></div></AdaptiveDialog>}
  </div>
}
