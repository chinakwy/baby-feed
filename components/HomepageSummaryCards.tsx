'use client'

import { Baby, Moon, ChevronRight } from 'lucide-react'
import type { DailyStats } from '@/components/Dashboard'
import type { ComposerRecordType } from '@/components/record-composer/record-types'
import { HOME_FEEDING_KEYS, type HomeCardKey, type HomeFeedingKey } from '@/lib/homepage-settings'
import { formatSleepMinutes } from '@/lib/homepage-sleep'
import { DEFAULT_SUPPLEMENTS, type SupplementDefinition, type SupplementEntry } from '@/lib/supplements'
import HomepageFeedingSummary from '@/components/HomepageFeedingSummary'
import HomepageSupplementSummary from '@/components/HomepageSupplementSummary'

export default function HomepageSummaryCards({cards,stats,onRecord,feedingTypes=HOME_FEEDING_KEYS,supplements=DEFAULT_SUPPLEMENTS,entries=[],solidFoodSummary}: {
 cards:HomeCardKey[];stats:DailyStats|null;onRecord:(key:ComposerRecordType)=>void;onFeedingRecord?:()=>void
 feedingTypes?:readonly HomeFeedingKey[];supplements?:SupplementDefinition[];entries?:SupplementEntry[];babyId?:string;solidFoodSummary?:string
}) {
  const nutrition=cards.includes('AD_VITAMIN'),diaper=cards.includes('DIAPER')
  const many=supplements.filter(item=>item.enabled).length>3
  return <div className="space-y-3">
    {cards.includes('FEEDING')&&<HomepageFeedingSummary types={feedingTypes} stats={stats} onRecord={onRecord} solidFoodSummary={solidFoodSummary}/>}
    {(nutrition||diaper)&&<div className={`grid items-stretch gap-3 ${nutrition&&diaper?(many?'grid-cols-[minmax(0,3fr)_minmax(0,2fr)]':'grid-cols-2'):'grid-cols-1'}`}>
      {nutrition&&<HomepageSupplementSummary definitions={supplements} entries={entries} adGiven={stats?.adGiven} vitaminDGiven={stats?.vitaminDGiven} onRecord={()=>onRecord('AD_VITAMIN')}/>}
      {diaper&&<button type="button" data-home-card="DIAPER" aria-label="记录大小便" onClick={()=>onRecord('DIAPER')} className="flex min-w-0 flex-col rounded-2xl border border-white/70 bg-white/70 p-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><span className="flex min-h-11 w-full items-center gap-1"><Baby size={21} className="shrink-0 text-amber-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">大小便</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></span><span className="mt-auto whitespace-nowrap text-2xl font-bold leading-8 text-slate-900 tabular-nums">{stats?.peeCount||0}<span className="mx-1.5 font-normal text-slate-300">/</span>{stats?.poopCount||0}</span><span className="mt-0.5 whitespace-nowrap text-xs text-slate-500">小便 / 大便</span></button>}
    </div>}
    {cards.includes('SLEEP')&&<button type="button" data-home-card="SLEEP" aria-label="记录睡眠" onClick={()=>onRecord('SLEEP')} className="flex min-h-[76px] w-full min-w-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500"><Moon size={23}/></span><span className="shrink-0 text-sm font-semibold text-slate-900">睡眠</span><span className="min-w-0 flex-1"><span className="block text-xl font-bold leading-7 text-slate-900">{formatSleepMinutes(stats?.sleepMinutes||0)}</span><span className="block text-xs leading-5 text-slate-500">今日 {stats?.sleepCount||0} 段 · {stats?.sleeping?'正在睡':'累计'}</span></span><ChevronRight size={16} className="shrink-0 text-slate-400"/></button>}
  </div>
}
