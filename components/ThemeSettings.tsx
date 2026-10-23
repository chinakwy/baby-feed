'use client'

import { useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { THEMES, type ThemeColor } from '@/lib/themes'
import { useTheme } from '@/components/ThemeProvider'

export default function ThemeSettings({ onBack }: { onBack: () => void }) {
  const { theme, loading, saving, setTheme } = useTheme()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function choose(value: ThemeColor) {
    setMessage(''); setError('')
    try { await setTheme(value); setMessage('主题颜色已保存') }
    catch (error) { setError(error instanceof Error ? error.message : '保存失败，请重试') }
  }
  return <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-8">
    <div className="flex items-center gap-3"><button type="button" onClick={onBack} aria-label="返回设置" className="mobile-touch-target flex items-center justify-center rounded-xl"><ArrowLeft size={20} /></button><h1 className="text-xl font-bold text-slate-900">主题颜色</h1></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-5 text-sm leading-6 text-slate-500">选择喜欢的颜色，用于导航、按钮和背景。按当前账号保存，其他家庭成员可以选择自己的颜色。</p>
      <div role="radiogroup" aria-label="主题颜色" className="grid grid-cols-2 gap-3">
        {THEMES.map(item => <button key={item.id} type="button" role="radio" aria-label={item.name} aria-checked={theme === item.id} disabled={loading || saving} onClick={() => choose(item.id)} className={`mobile-touch-target flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition disabled:opacity-60 ${theme === item.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-100 hover:border-slate-300'}`}>
          <span className="flex items-center gap-2"><span className="h-7 w-7 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" /><span className="text-sm font-medium text-slate-700">{item.name}</span></span>
          {theme === item.id && <Check size={17} className="shrink-0 text-blue-600" aria-hidden="true" />}
        </button>)}
      </div>
      {(loading || saving) && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{saving ? '正在保存…' : '正在读取…'}</p>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-600">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  </div>
}
