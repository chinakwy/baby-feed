'use client'

import { useRouter } from 'next/navigation'
import HomepageSettings from '@/components/HomepageSettings'

export default function HomepageSettingsPage() {
  const router = useRouter()
  return <HomepageSettings onBack={() => router.push('/settings')} />
}
