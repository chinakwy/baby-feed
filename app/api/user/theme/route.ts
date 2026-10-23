import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { noStoreHeaders } from '@/lib/api-helpers'
import { safeParseBody, validateSameOrigin } from '@/lib/validation'
import { buildUserActionKey, enforceRateLimit } from '@/lib/rate-limit'
import { getRateLimit } from '@/lib/rate-limit-config'
import { getTheme, isThemeColor } from '@/lib/themes'
import { logError } from '@/lib/logger'

async function handle(request: NextRequest, save: boolean) {
  try {
    const session = await auth(request)
    if (!session?.user?.id) return NextResponse.json({ error: '未授权' }, { status: 401, headers: noStoreHeaders })
    if (save) {
      const origin = validateSameOrigin(request)
      if (!origin.valid) return NextResponse.json({ error: origin.error }, { status: 403, headers: noStoreHeaders })
    }
    const action = save ? 'user-theme-update' : 'user-theme-read'
    const limit = enforceRateLimit({ key: buildUserActionKey(action, session.user.id, request), ...getRateLimit(action) })
    if (!limit.allowed) return NextResponse.json({ error: '操作过于频繁，请稍后再试' }, { status: 429, headers: { ...noStoreHeaders, 'Retry-After': String(limit.retryAfterSeconds) } })
    if (save) {
      const { data, error } = await safeParseBody(request)
      if (error || !data || !isThemeColor(data.theme)) return NextResponse.json({ error: '请选择支持的主题颜色' }, { status: 400, headers: noStoreHeaders })
      await prisma.user.update({ where: { id: session.user.id }, data: { themeColor: data.theme } })
      revalidatePath('/', 'layout')
      return NextResponse.json({ theme: data.theme }, { headers: noStoreHeaders })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { themeColor: true } })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404, headers: noStoreHeaders })
    return NextResponse.json({ theme: getTheme(user.themeColor).id }, { headers: noStoreHeaders })
  } catch (error) {
    logError('主题设置失败', error)
    return NextResponse.json({ error: '主题设置失败，请稍后重试' }, { status: 500, headers: noStoreHeaders })
  }
}
export const GET = (request: NextRequest) => handle(request, false)
export const PUT = (request: NextRequest) => handle(request, true)
