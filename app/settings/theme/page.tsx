'use client'

import { useRouter } from 'next/navigation'
import ThemeSettings from '@/components/ThemeSettings'
export default function ThemeSettingsPage() {
  const router = useRouter()
  return <ThemeSettings onBack={() => router.push('/settings')} />
}
