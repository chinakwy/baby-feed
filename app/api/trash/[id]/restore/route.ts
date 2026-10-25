import { familyDataOwner } from '@/lib/family-access'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { validateId, validateSameOrigin } from '@/lib/validation'
import { noStoreHeaders } from '@/lib/api-helpers'
import { restoreDeletedRecord } from '@/lib/deleted-records'
import { emitFeedingCreated, emitHealthCreated } from '@/lib/webhook-service'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(request)
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401, headers: noStoreHeaders })
  const origin = validateSameOrigin(request)
  if (!origin.valid) return NextResponse.json({ error: origin.error }, { status: 403, headers: noStoreHeaders })
  const { id } = await params
  const valid = validateId(id, '回收站记录ID')
  if (!valid.valid) return NextResponse.json({ error: valid.error }, { status: 400, headers: noStoreHeaders })
  try {
    const result = await restoreDeletedRecord(familyDataOwner(session.user), id)
    if (result.kind === 'feeding') {
      await emitFeedingCreated(familyDataOwner(session.user), result.record, result.baby).catch(error => logError('恢复后的通知事件写入失败', error))
    } else {
      await emitHealthCreated(familyDataOwner(session.user), result.record, result.baby).catch(error => logError('恢复后的通知事件写入失败', error))
    }
    for (const path of ['/', '/timeline', '/stats']) revalidatePath(path)
    return NextResponse.json({ success: true, babyId: result.baby.id, recordId: result.record.id }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === 'TRASH_NOT_FOUND') {
      return NextResponse.json({ error: '记录不存在或已恢复' }, { status: 404, headers: noStoreHeaders })
    }
    const code = (error as { code?: string })?.code
    if (code === 'P2002' || code === 'P2034') {
      return NextResponse.json({ error: '记录与现有数据冲突，请刷新后检查；回收站记录仍保留' }, { status: 409, headers: noStoreHeaders })
    }
    logError('恢复记录失败', error)
    return NextResponse.json({ error: '恢复失败，请重试；回收站记录仍保留' }, { status: 500, headers: noStoreHeaders })
  }
}
