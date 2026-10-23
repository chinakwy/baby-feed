'use client'

import { Baby, Droplets, Milk, Moon, Pill, Plus, ChevronRight, Heart, UtensilsCrossed, Check } from 'lucide-react'
import type { DailyStats } from '@/components/Dashboard'
import type { ComposerRecordType } from '@/components/record-composer/record-types'
import { HOME_CARD_LABELS, HOME_FEEDING_KEYS, type HomeCardKey, type HomeFeedingKey } from '@/lib/homepage-settings'
import { formatSleepMinutes } from '@/lib/homepage-sleep'
import { DEFAULT_SUPPLEMENTS, type SupplementDefinition, type SupplementEntry } from '@/lib/supplements'

const cardClass = 'group flex min-h-48 min-w-0 flex-col rounded-2xl border border-white/70 bg-white/70 p-3.5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export default function HomepageSummaryCards({ cards, stats, onRecord, onFeedingRecord, feedingTypes = HOME_FEEDING_KEYS, supplements = DEFAULT_SUPPLEMENTS, entries = [] }: {
  cards: HomeCardKey[]; stats: DailyStats | null; onRecord: (key: ComposerRecordType) => void; onFeedingRecord?: () => void
  feedingTypes?: readonly HomeFeedingKey[]; supplements?: SupplementDefinition[]; entries?: SupplementEntry[]; babyId?: string
}) {
  const icons = { FEEDING: Droplets, SLEEP: Moon, AD_VITAMIN: Pill, DIAPER: Baby }
  const tones = { FEEDING: 'bg-pink-50 text-pink-500', SLEEP: 'bg-indigo-50 text-indigo-500', AD_VITAMIN: 'bg-orange-50 text-orange-500', DIAPER: 'bg-amber-50 text-amber-500' }
  const uniqueEntries = [...new Map(entries.map(entry => [entry.id, entry])).values()]
  // Preserve today's intake even if the corresponding project was subsequently disabled.
  const nutrition = [...supplements.filter(x => x.enabled), ...uniqueEntries.filter(x => !supplements.some(d => d.id === x.id && d.enabled)).map(x => ({ ...x, unit: x.unit || '', enabled: true }))]
  const given = (id: string) => entries.some(x => x.id === id) || (id === 'AD' && !!stats?.adGiven) || (id === 'VITAMIN_D' && !!stats?.vitaminDGiven)
  const taken = nutrition.filter(x => given(x.id))
  const pending = nutrition.filter(x => !given(x.id))
  const compactFeeding = feedingTypes.length >= 3
  const mobileWideCards = new Set<HomeCardKey>()
  const feedingIndex = cards.indexOf('FEEDING')
  if (compactFeeding && feedingIndex >= 0) {
    mobileWideCards.add('FEEDING')
    // Fill an odd trailing card in each run without changing saved order.
    for (const run of [cards.slice(0, feedingIndex), cards.slice(feedingIndex + 1)]) {
      if (run.length % 2) mobileWideCards.add(run[run.length - 1])
    }
  }
  const feeding = {
    BREAST_MILK: { label: '亲喂', icon: Heart, tone: 'bg-pink-50 text-pink-500', count: stats?.breastFeedingCount || 0, value: `${stats?.totalBreastDuration || 0}分钟` },
    BREAST_MILK_BOTTLE: { label: '母乳瓶喂', icon: Milk, tone: 'bg-rose-50 text-rose-400', count: stats?.breastBottleCount || 0, value: `${stats?.totalBreastMilkAmount || 0}ml` },
    FORMULA: { label: '奶粉', icon: Milk, tone: 'bg-sky-50 text-sky-500', count: stats?.formulaCount || 0, value: `${stats?.totalFormulaAmount || 0}ml` },
    SOLID_FOOD: { label: '辅食', icon: UtensilsCrossed, tone: 'bg-emerald-50 text-emerald-500', count: stats?.solidFoodCount || 0, value: `${stats?.solidFoodCount || 0}次` },
  }

  return <div className="grid grid-cols-2 items-stretch gap-3">{cards.map(key => {
    const Icon = icons[key]
    const disabled = key === 'FEEDING' && feedingTypes.length === 0
    return <button key={key} type="button" data-home-card={key} aria-label={`记录${HOME_CARD_LABELS[key]}`} disabled={disabled} onClick={() => key === 'FEEDING' ? (onFeedingRecord ? onFeedingRecord() : onRecord(feedingTypes[0])) : onRecord(key)} className={`${cardClass} ${mobileWideCards.has(key) ? 'col-span-2 sm:col-span-1' : ''} disabled:cursor-default disabled:opacity-70`}>
      <span className="mb-3 flex w-full items-center justify-between gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${tones[key]}`}><Icon size={18} aria-hidden="true" /></span>
        <span className="text-xs font-medium text-slate-500">{HOME_CARD_LABELS[key]}</span>
      </span>
      {key === 'FEEDING' && <span className={`my-auto grid w-full gap-3 ${compactFeeding ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {feedingTypes.map(type => {
          const item = feeding[type]
          const MethodIcon = item.icon
          return <span key={type} data-feeding-method={type} className="flex min-w-0 flex-col gap-0.5">
            <span className={`flex min-w-0 items-center ${compactFeeding ? 'gap-1' : 'gap-2'}`}>
              <span className={`flex shrink-0 items-center justify-center ${compactFeeding ? 'h-5 w-5 rounded-md' : 'h-8 w-8 rounded-xl'} ${item.tone}`}><MethodIcon size={compactFeeding ? 14 : 19} aria-hidden="true" /></span>
              <span className={`min-w-0 break-words font-medium text-slate-500 ${compactFeeding ? 'text-[11px]' : 'text-xs'}`}>{item.label}</span>
            </span>
            <span className="flex min-w-0 items-baseline gap-x-1">
              <span className={`whitespace-nowrap font-bold leading-7 tracking-tight text-slate-900 tabular-nums ${compactFeeding ? 'text-base' : 'text-xl'}`}>{item.value}</span>
              {type !== 'SOLID_FOOD' && <span className="shrink-0 text-xs text-slate-400">{item.count}次</span>}
            </span>
          </span>
        })}
        {disabled && <span className="text-xs text-slate-500">未启用喂养项目</span>}
      </span>}
      {key === 'SLEEP' && <span className="my-auto block py-2">
        <span className="block break-words text-2xl font-extrabold leading-snug tracking-tight text-slate-900">{formatSleepMinutes(stats?.sleepMinutes || 0)}</span>
        <span className="mt-2 block text-xs text-slate-500">今日 {stats?.sleepCount || 0} 段</span>
        <span className={`mt-1 block text-xs ${stats?.sleeping ? 'text-indigo-500' : 'text-slate-400'}`}>{stats?.sleeping ? '宝宝正在睡' : '累计睡眠时长'}</span>
      </span>}
      {key === 'AD_VITAMIN' && <span className="my-auto flex w-full flex-col gap-3">
        {!nutrition.length ? <span className="text-xs text-slate-500">尚未启用补充项目</span> : <>
          <span data-supplement-status="given" className="block">
            <span className="mb-1.5 block text-xs font-medium text-emerald-600">已补充</span>
            <span className="flex flex-wrap gap-1.5">{taken.length ? taken.map(item => <span key={item.id} className="inline-flex min-w-0 items-start gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium leading-5 text-emerald-700"><Check size={13} aria-hidden="true" className="mt-1 shrink-0" /><span className="min-w-0 break-all">{item.name}</span></span>) : <span className="text-xs text-slate-400">暂无</span>}</span>
          </span>
          <span data-supplement-status="pending" className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">未补充</span>
            <span className="flex flex-wrap gap-1.5">{pending.length ? pending.map(item => <span key={item.id} className="min-w-0 break-all rounded-lg bg-slate-50 px-2 py-1 text-xs leading-5 text-slate-500">{item.name}</span>) : <span className="text-xs text-emerald-600">全部已补充</span>}</span>
          </span>
        </>}
      </span>}
      {key === 'DIAPER' && <span className="my-auto block py-2">
        <span className="block text-3xl font-extrabold tracking-tight text-slate-900">{stats?.peeCount || 0}<span className="mx-2 font-normal text-slate-300">/</span>{stats?.poopCount || 0}</span>
        <span className="mt-2 block text-xs text-slate-500">小便 / 大便</span>
      </span>}
      {!disabled && <span aria-hidden="true" className="mt-auto flex w-full items-center justify-between pt-3 text-xs font-medium text-blue-500"><span className="flex items-center gap-0.5"><Plus size={13} />记录</span><ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500" /></span>}
    </button>
  })}</div>
}
