'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getTheme, isThemeColor, themeStyle, type ThemeColor } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeColor
  loading: boolean
  saving: boolean
  setTheme: (theme: ThemeColor) => Promise<void>
}
const ThemeContext = createContext<ThemeContextValue | null>(null)
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('ThemeProvider is required')
  return value
}

export function ThemeProvider({ children, initialTheme = 'blue' }: { children: React.ReactNode; initialTheme?: ThemeColor }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const [theme, updateTheme] = useState<ThemeColor>(initialTheme)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const generation = useRef(0)
  const pendingSave = useRef(false)

  useEffect(() => {
    const selected = getTheme(theme)
    document.documentElement.dataset.theme = selected.id
    for (const [key, value] of Object.entries(themeStyle(theme))) document.documentElement.style.setProperty(key, String(value))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', selected.color)
  }, [theme])

  useEffect(() => {
    const current = ++generation.current
    const controller = new AbortController()
    pendingSave.current = false
    setSaving(false)
    if (!userId) {
      if (status !== 'loading') updateTheme('blue')
      setLoading(status === 'loading')
      return () => controller.abort()
    }
    setLoading(true)
    fetch('/api/user/theme', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('无法读取主题设置')
        const data = await response.json()
        if (current === generation.current && !controller.signal.aborted) updateTheme(getTheme(data.theme).id)
      })
      .catch(() => { /* Keep the server-rendered color when the connection is temporarily unavailable. */ })
      .finally(() => { if (current === generation.current && !controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [userId, status])

  const setTheme = useCallback(async (next: ThemeColor) => {
    if (!userId || loading || pendingSave.current || !isThemeColor(next)) throw new Error('请等待主题设置加载后重试')
    const current = generation.current
    pendingSave.current = true
    setSaving(true)
    try {
      const response = await fetch('/api/user/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }) })
      const data = await response.json()
      if (!response.ok || !isThemeColor(data.theme)) throw new Error(data.error || '保存失败，请重试')
      if (current === generation.current) updateTheme(data.theme)
    } finally {
      if (current === generation.current) { pendingSave.current = false; setSaving(false) }
    }
  }, [userId, loading])

  return <ThemeContext.Provider value={{ theme, loading, saving, setTheme }}>{children}</ThemeContext.Provider>
}
