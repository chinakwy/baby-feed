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
  const nutrition=cards.includes('AD_VITAMIN'),diaper=cards.includes('DIAPER'),sleep=cards.includes('SLEEP')
  const cardClass='flex min-w-0 flex-col rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
  return <div className="space-y-2.5">
    {cards.includes('FEEDING')&&<HomepageFeedingSummary types={feedingTypes} stats={stats} onRecord={onRecord} solidFoodSummary={solidFoodSummary}/>}
    {(sleep||diaper)&&<div data-summary-row="sleep-diaper" className={`grid items-stretch gap-2.5 ${sleep&&diaper?'grid-cols-2':'grid-cols-1'}`}>
      {sleep&&<button type="button" data-home-card="SLEEP" aria-label="记录睡眠" onClick={()=>onRecord('SLEEP')} className={cardClass}><span className="flex min-h-9 w-full items-center gap-1"><Moon size={21} className="shrink-0 text-violet-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">睡眠</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></span><span className="mt-auto break-words text-xl font-bold leading-8 text-slate-900 tabular-nums">{formatSleepMinutes(stats?.sleepMinutes||0)}</span><span className="mt-0.5 text-xs text-slate-500">今日 {stats?.sleepCount||0} 段 · {stats?.sleeping?'正在睡':'累计'}</span></button>}
      {diaper&&<button type="button" data-home-card="DIAPER" aria-label="记录大小便" onClick={()=>onRecord('DIAPER')} className={cardClass}><span className="flex min-h-9 w-full items-center gap-1"><Baby size={21} className="shrink-0 text-amber-500"/><span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-slate-900">大小便</span><ChevronRight size={14} className="shrink-0 text-slate-400"/></span><span className="mt-auto whitespace-nowrap text-2xl font-bold leading-8 text-slate-900 tabular-nums">{stats?.peeCount||0}<span className="mx-1.5 font-normal text-slate-300">/</span>{stats?.poopCount||0}</span><span className="mt-0.5 whitespace-nowrap text-xs text-slate-500">小便 / 大便</span></button>}
    </div>}
    {nutrition&&<HomepageSupplementSummary definitions={supplements} entries={entries} adGiven={stats?.adGiven} vitaminDGiven={stats?.vitaminDGiven} onRecord={()=>onRecord('AD_VITAMIN')}/>}
  </div>
}
