'use client'

import { useCallback, useEffect, useState } from 'react'
import { getRecordTitle, type DisplayRecord } from '@/lib/record-display'
import { invalidateRecordRelatedCaches } from '@/lib/cache-helpers'

interface TrashItem {
  id: string
  babyId: string
  kind: 'feeding' | 'health'
  deletedAt: string
  baby: { name: string }
  record: DisplayRecord & { startTime?: string; recordedAt?: string; notes?: string | null }
}
const beijing = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/trash', { cache: 'no-store' })
      if (!response.ok) throw new Error('读取回收站失败，请重试')
      setItems(await response.json())
    } catch (error) {
      setError(error instanceof Error ? error.message : '读取失败')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const restore = async (item: TrashItem) => {
    if (restoringId) return
    setRestoringId(item.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/trash/${item.id}/restore`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '恢复失败，请重试')
      invalidateRecordRelatedCaches(item.babyId)
      setItems(current => current.filter(record => record.id !== item.id))
      setMessage('已恢复，原发生时间和记录人保持不变。')
    } catch (error) {
      setError(error instanceof Error ? error.message : '恢复失败，请重试')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <a href="/settings" className="text-blue-700">← 返回设置</a>
      <h1 className="text-2xl font-bold text-slate-900">回收站</h1>
      <p className="text-sm text-slate-600">这里保留启用回收站后删除的喂养与健康记录，不自动清空。恢复后会重新计入时间轴和统计。删除宝宝或账号不在此保护范围内。</p>
      <div className="flex gap-4 text-sm">
        <a href="/timeline" className="text-blue-700">查看时间轴</a>
        <button type="button" disabled={loading || !!restoringId} onClick={() => void load()} className="text-blue-700 disabled:opacity-50">刷新回收站</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{message}</p>}
      {loading ? <p>正在读取…</p> : items.length === 0 ? <p className="rounded-xl bg-white p-5 text-slate-500">暂无已删除记录</p> : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id} className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="font-semibold">{item.baby.name} · {getRecordTitle({ ...item.record, recordType: item.kind } as DisplayRecord)}</p>
              <p className="text-sm text-slate-600">发生时间：{beijing(item.record.startTime || item.record.recordedAt || item.deletedAt)}</p>
              <p className="text-sm text-slate-500">删除时间：{beijing(item.deletedAt)}</p>
              {item.record.notes && <p className="break-words text-sm text-slate-600">备注：{item.record.notes}</p>}
              <button type="button" disabled={!!restoringId} onClick={() => void restore(item)} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-white disabled:opacity-50">
                {restoringId === item.id ? '正在恢复…' : '恢复记录'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
