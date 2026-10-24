'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'

interface Item { key: string; label: string }
export default function HomeVisibilityList({ title, items, value, onChange, disabled = false, allowReorder = true }: {
  title: string; items: Item[]; value: string[]; onChange: (value: string[]) => void; disabled?: boolean; allowReorder?: boolean
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ key: string; pointerId: number; y: number } | null>(null)
  const valueRef = useRef(value)
  const changeRef = useRef(onChange)
  valueRef.current = value
  changeRef.current = onChange
  const [dragging, setDragging] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const move = useCallback((key: string, targetIndex: number) => {
    const current = valueRef.current
    const index = current.indexOf(key)
    const target = Math.max(0, Math.min(targetIndex, current.length - 1))
    if (index < 0 || index === target) return
    const next = [...current]
    next.splice(index, 1)
    next.splice(target, 0, key)
    valueRef.current = next
    changeRef.current(next)
    setAnnouncement(`已调整到第 ${target + 1} 位`)
  }, [])
  const reorder = useCallback((y: number) => {
    const key = dragRef.current?.key
    if (!key || !listRef.current) return
    const rows = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-home-sort-key]')).filter(row => row.dataset.homeSortKey !== key)
    const index = rows.findIndex(row => { const bounds = row.getBoundingClientRect(); return y < bounds.top + bounds.height / 2 })
    move(key, index < 0 ? rows.length : index)
  }, [move])
  useEffect(() => {
    if (!dragging) return
    let frame: number | null = null
    const scroll = () => {
      if (!dragRef.current) return
      const y = dragRef.current.y
      const edge = Math.min(80, window.innerHeight * 0.15)
      const amount = y < edge ? -10 : window.innerHeight - y < edge ? 10 : 0
      if (amount) { window.scrollBy(0, amount); reorder(y) }
      frame = window.requestAnimationFrame(scroll)
    }
    const movePointer = (event: PointerEvent) => {
      if (event.pointerId !== dragRef.current?.pointerId) return
      event.preventDefault()
      dragRef.current.y = event.clientY
      reorder(event.clientY)
    }
    const end = (event: PointerEvent) => {
      if (event.pointerId !== dragRef.current?.pointerId) return
      dragRef.current = null
      setDragging(null)
      setAnnouncement('排序完成')
    }
    frame = window.requestAnimationFrame(scroll)
    window.addEventListener('pointermove', movePointer, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', movePointer)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging, reorder])
  const ordered = allowReorder ? [...value.map(key => items.find(item => item.key === key)!).filter(Boolean), ...items.filter(item => !value.includes(item.key))] : items
  return (
    <section className="overflow-hidden rounded-card border border-blue-50 bg-white shadow-card">
      <div className="border-b border-slate-100 p-4"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{allowReorder ? '勾选显示；拖动手柄或使用上下按钮调整顺序。' : '勾选显示；首页按固定顺序排列。'}</p></div>
      <div ref={listRef} className="divide-y divide-slate-100">
        {ordered.map(item => {
          const index = value.indexOf(item.key), enabled = index >= 0
          return (
            <div key={item.key} data-home-sort-key={enabled ? item.key : undefined} className={`flex min-h-16 items-center gap-1 px-3 py-2 ${dragging === item.key ? 'select-none bg-blue-50' : enabled ? 'bg-white' : 'bg-slate-50'}`}>
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pr-2">
                <input type="checkbox" aria-label={`显示${item.label}`} checked={enabled} disabled={disabled} onChange={() => onChange(enabled ? value.filter(key => key !== item.key) : [...value, item.key])} className="h-5 w-5 shrink-0 accent-blue-600" />
                <span className={`text-sm font-semibold ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
              </label>
              {allowReorder && <>
              <button type="button" disabled={disabled || !enabled || index === 0} aria-label={`上移${item.label}`} onClick={() => move(item.key, index - 1)} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25"><ArrowUp size={17} /></button>
              <button type="button" disabled={disabled || !enabled || index === value.length - 1} aria-label={`下移${item.label}`} onClick={() => move(item.key, index + 1)} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-25"><ArrowDown size={17} /></button>
              <button type="button" disabled={disabled || !enabled} aria-label={`拖动调整${item.label}顺序`} aria-grabbed={dragging === item.key}
                onPointerDown={event => {
                  if (disabled || !enabled || !event.isPrimary || event.button !== 0) return
                  event.preventDefault(); dragRef.current = { key: item.key, pointerId: event.pointerId, y: event.clientY }; setDragging(item.key)
                }}
                onKeyDown={event => {
                  const targets: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: value.length - 1 }
                  if (!(event.key in targets)) return
                  event.preventDefault(); move(item.key, targets[event.key])
                }}
                className="flex h-11 w-10 shrink-0 touch-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><GripVertical size={20} /></button>
              </>}
            </div>
          )
        })}
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </section>
  )
}
