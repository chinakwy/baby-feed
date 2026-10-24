'use client'

import { Droplets, Milk, UtensilsCrossed } from 'lucide-react'
import type { DailyStats } from '@/components/Dashboard'
import type { HomeFeedingKey } from '@/lib/homepage-settings'

function amount(value:number) { return value >= 10000 ? `${Number((value/10000).toFixed(1))}万` : String(Number(value.toFixed(1))) }
export default function HomepageFeedingSummary({types,stats,onRecord,solidFoodSummary='今日辅食'}:{types:readonly HomeFeedingKey[];stats:DailyStats|null;onRecord:(type:HomeFeedingKey)=>void;solidFoodSummary?:string}) {
  const items = {
    BREAST_MILK:{name:'亲喂',icon:Droplets,tone:'from-pink-50/90 to-pink-50/40 text-pink-500',value:stats?.breastFeedingCount||0,unit:'次',detail:`${stats?.totalBreastDuration||0}分钟`},
    BREAST_MILK_BOTTLE:{name:'瓶喂',icon:Milk,tone:'from-rose-50/90 to-pink-50/40 text-rose-500',value:stats?.totalBreastMilkAmount||0,unit:'ml',detail:`${stats?.breastBottleCount||0}次`},
    FORMULA:{name:'奶粉',icon:Milk,tone:'from-sky-50/90 to-sky-50/40 text-sky-500',value:stats?.totalFormulaAmount||0,unit:'ml',detail:`${stats?.formulaCount||0}次`},
    SOLID_FOOD:{name:'辅食',icon:UtensilsCrossed,tone:'from-orange-50/90 to-amber-50/40 text-orange-500',value:stats?.solidFoodCount||0,unit:'次',detail:solidFoodSummary},
  }
  if(!types.length)return null
  return <div data-home-card="FEEDING" data-feeding-columns={types.length} className="rounded-2xl border border-white/70 bg-white/70 p-2 shadow-sm">
    <div className="grid gap-1 sm:gap-2" style={{gridTemplateColumns:`repeat(${types.length}, minmax(0, 1fr))`}}>
      {types.map(type=>{const item=items[type];const Icon=item.icon;return <button key={type} type="button" data-feeding-method={type} aria-label={`记录${item.name}`} onClick={()=>onRecord(type)} className={`min-h-[80px] min-w-0 rounded-xl bg-gradient-to-br py-2 ${types.length===4?'px-0.5':'px-1.5'} text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${item.tone}`}>
        <span className={`flex min-w-0 items-center ${types.length===1?'gap-3':'gap-1.5'}`}>
          <Icon size={types.length>=3?19:22} className="shrink-0" aria-hidden="true"/>
          <span className="min-w-0 truncate text-xs font-semibold sm:text-sm">{item.name}</span>
          {types.length===1&&<span title={`${item.value}${item.unit}`} className="ml-auto whitespace-nowrap text-2xl font-bold leading-7 text-slate-900 tabular-nums">{amount(item.value)}<span className="ml-1 text-xs font-medium">{item.unit}</span></span>}
        </span>
        {types.length!==1&&<span title={`${item.value}${item.unit}`} className={`mt-1 flex flex-wrap items-baseline font-bold leading-7 tracking-tight text-slate-900 tabular-nums ${types.length===4?'text-xl':'text-2xl'}`}><span className="whitespace-nowrap">{amount(item.value)}</span><span className="ml-0.5 text-xs font-medium tracking-normal">{item.unit}</span></span>}
        <span title={item.detail} className={`block min-w-0 truncate text-xs leading-5 text-slate-500 ${types.length===1?'mt-0.5 text-right':'mt-0.5'}`}>{item.detail}</span>
      </button>})}
    </div>
  </div>
}
