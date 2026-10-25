import { familyDataOwner } from '@/lib/family-access'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { noStoreHeaders } from '@/lib/api-helpers'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const session = await auth(request)
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401, headers: noStoreHeaders })
  try {
    const records = await prisma.deletedRecord.findMany({
      where: { userId: familyDataOwner(session.user) }, orderBy: { deletedAt: 'desc' },
      include: { baby: { select: { name: true } } },
    })
    return NextResponse.json(records.map(({ snapshot, ...item }) => ({ ...item, record: JSON.parse(snapshot) })), { headers: noStoreHeaders })
  } catch (error) {
    logError('读取回收站失败', error)
    return NextResponse.json({ error: '读取回收站失败' }, { status: 500, headers: noStoreHeaders })
  }
}
