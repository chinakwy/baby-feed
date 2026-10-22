'use client'

import { Baby, Droplets, Milk, Pill, Plus } from 'lucide-react'
import type { DailyStats } from '@/components/Dashboard'
import { HOME_CARD_LABELS, type HomeCardKey } from '@/lib/homepage-settings'

export default function HomepageSummaryCards({ cards, stats, onRecord }: {
  cards: HomeCardKey[]; stats: DailyStats | null; onRecord: (key: HomeCardKey) => void
}) {
  const icons = { BREAST_MILK: Droplets, FORMULA: Milk, AD_VITAMIN: Pill, DIAPER: Baby }
  const tones = { BREAST_MILK: 'text-pink-500', FORMULA: 'text-blue-500', AD_VITAMIN: 'text-orange-500', DIAPER: 'text-amber-500' }
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(key => {
        const Icon = icons[key]
        return (
          <button key={key} type="button" data-home-card={key} aria-label={`记录${HOME_CARD_LABELS[key]}`} onClick={() => onRecord(key)}
            className="min-h-32 rounded-card border border-blue-50 bg-white p-3 text-left shadow-card transition hover:border-blue-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <div className="mb-1.5 flex items-center justify-between gap-2"><Icon size={20} className={tones[key]} /><span className="text-xs font-medium text-slate-500">{HOME_CARD_LABELS[key]}</span></div>
            {key === 'BREAST_MILK' && <>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900">{(stats?.breastFeedingCount || 0) + (stats?.breastBottleCount || 0)}</p>
              <p className="text-xs text-slate-500">亲喂{stats?.breastFeedingCount || 0}次 · {stats?.totalBreastDuration || 0}分钟</p>
              {(stats?.breastBottleCount || 0) > 0 && <p className="text-xs text-slate-500">瓶喂{stats?.breastBottleCount || 0}次（{stats?.totalBreastMilkAmount || 0}ml）</p>}
            </>}
            {key === 'FORMULA' && <><p className="text-2xl font-extrabold tracking-tight text-slate-900">{stats?.formulaCount || 0}</p><p className="text-xs text-slate-500">次 · {stats?.totalFormulaAmount || 0}ml</p></>}
            {key === 'AD_VITAMIN' && <><p className="text-lg font-extrabold text-slate-900">AD {stats?.adGiven ? '✓' : '○'} · 维D {stats?.vitaminDGiven ? '✓' : '○'}</p><p className="text-xs text-slate-500">今日补充状态</p></>}
            {key === 'DIAPER' && <><p className="text-2xl font-extrabold tracking-tight text-slate-900">{stats?.peeCount || 0} / {stats?.poopCount || 0}</p><p className="text-xs text-slate-500">小便 / 大便</p></>}
            <span aria-hidden="true" className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600"><Plus size={13} />记录</span>
          </button>
        )
      })}
    </div>
  )
}
