'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LayoutGrid, Loader2, RotateCcw, Save } from 'lucide-react'
import HomeVisibilityList from '@/components/HomeVisibilityList'
import { defaultHomepageSettings, HOME_SECTION_KEYS, HOME_CARD_KEYS, HOME_SECTION_LABELS, HOME_CARD_LABELS, validateHomepageSettings, type HomepageSettings as Settings } from '@/lib/homepage-settings'

export default function HomepageSettings({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(defaultHomepageSettings)
  const [saved, setSaved] = useState<Settings>(defaultHomepageSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    void fetch('/api/user/homepage', { cache: 'no-store' }).then(async response => {
      const result = await response.json()
      if (!response.ok || validateHomepageSettings(result) !== null) throw new Error(result.error || '读取首页设置失败')
      if (active) { setSettings(result); setSaved(result) }
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : '读取失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved)
  const update = (field: 'sections' | 'cards', keys: string[]) => {
    setSettings(current => ({ ...current, [field]: keys }))
    setMessage(''); setError('')
  }
  const save = async () => {
    if (!dirty || saving) return
    setSaving(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/user/homepage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      const result = await response.json()
      if (!response.ok || validateHomepageSettings(result) !== null) throw new Error(result.error || '保存首页设置失败')
      setSettings(result); setSaved(result); setMessage('首页展示已保存，返回首页即可查看。')
    } catch (error) { setError(error instanceof Error ? error.message : '保存失败，请重试') }
    finally { setSaving(false) }
  }
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" size={22} />正在加载首页设置</div>
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <header className="flex items-center gap-2">
        <button type="button" aria-label="返回设置" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><ArrowLeft size={20} /></button>
        <LayoutGrid size={22} className="shrink-0 text-blue-600" /><h1 className="min-w-0 flex-1 text-xl font-bold text-slate-900">首页展示管理</h1>
        <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? '保存中' : '保存'}</button>
      </header>
      <p className="text-sm text-slate-600">管理首页区块和统计卡片。隐藏只改变展示，不会删除记录；同账号的其他设备也会沿用已保存的设置。</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      <HomeVisibilityList title="首页区块" items={HOME_SECTION_KEYS.map(key => ({ key, label: HOME_SECTION_LABELS[key] }))} value={settings.sections} onChange={keys => update('sections', keys)} disabled={saving} />
      <HomeVisibilityList title="统计卡片" items={HOME_CARD_KEYS.map(key => ({ key, label: HOME_CARD_LABELS[key] }))} value={settings.cards} onChange={keys => update('cards', keys)} disabled={saving} />
      {!settings.sections.includes('SUMMARY') && <p className="text-xs text-slate-500">“统计卡片”区块目前已隐藏，启用后才会显示所选卡片。</p>}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button type="button" disabled={saving} onClick={() => { setSettings(defaultHomepageSettings()); setError(''); setMessage('已恢复默认布局，请点击保存。') }} className="inline-flex min-h-11 items-center gap-1 text-slate-600"><RotateCcw size={16} />恢复默认</button>
        <Link href="/" prefetch={false} className="text-blue-700">返回首页</Link><a href="/settings/quick-records" className="text-blue-700">管理快捷记录项目</a>
      </div>
    </div>
  )
}
