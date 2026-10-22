import type { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { rescheduleIntervalRulesForRecordChange } from '@/lib/reminder-rescheduler'
import { syncAutoVaccineReminders } from '@/lib/reminder-auto-vaccine'

type RecordKind = 'feeding' | 'health'

export async function archiveDeletedRecord(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: RecordKind,
  record: { id: string; babyId: string; createdBy: string },
) {
  if (record.createdBy !== userId) throw new Error('TRASH_NOT_FOUND')
  await tx.deletedRecord.create({
    data: { userId, babyId: record.babyId, recordId: record.id, kind, snapshot: JSON.stringify(record) },
  })
}

export async function restoreDeletedRecord(userId: string, id: string) {
  return prisma.$transaction(async tx => {
    const archived = await tx.deletedRecord.findFirst({ where: { id, userId } })
    if (!archived) throw new Error('TRASH_NOT_FOUND')
    const baby = await tx.baby.findFirst({ where: { id: archived.babyId, createdBy: userId } })
    if (!baby) throw new Error('TRASH_NOT_FOUND')

    const snapshot = JSON.parse(archived.snapshot)
    if (snapshot.id !== archived.recordId || snapshot.babyId !== baby.id || snapshot.createdBy !== userId) {
      throw new Error('TRASH_INVALID_SNAPSHOT')
    }
    // Claim within the same transaction: a failed insert rolls this deletion back.
    const claimed = await tx.deletedRecord.deleteMany({ where: { id, userId } })
    if (claimed.count !== 1) throw new Error('TRASH_NOT_FOUND')
    const { toothEruptions, ...data } = snapshot
    for (const field of ['startTime', 'endTime', 'recordedAt', 'sleepStartTime', 'sleepEndTime', 'createdAt', 'updatedAt']) {
      if (data[field] != null) data[field] = new Date(data[field])
    }
    data.updatedAt = new Date()

    if (archived.kind === 'feeding') {
      const record = await tx.feedingRecord.create({ data: data as Prisma.FeedingRecordUncheckedCreateInput })
      await rescheduleIntervalRulesForRecordChange({ userId, babyId: baby.id, sourceType: 'feeding', newRecord: record, db: tx })
      return { kind: 'feeding' as const, baby, record }
    }
    if (archived.kind !== 'health') throw new Error('TRASH_INVALID_SNAPSHOT')
    const record = await tx.healthRecord.create({ data: data as Prisma.HealthRecordUncheckedCreateInput })
    if (Array.isArray(toothEruptions) && toothEruptions.length > 0) {
      await tx.toothEruption.createMany({
        data: toothEruptions.map((tooth: { id: string; toothCode: string }) => ({
          id: tooth.id, toothCode: tooth.toothCode, healthRecordId: record.id, babyId: baby.id,
        })),
      })
    }
    await rescheduleIntervalRulesForRecordChange({ userId, babyId: baby.id, sourceType: 'health', newRecord: record, db: tx })
    if (record.type === 'VACCINE') {
      await syncAutoVaccineReminders({ userId, babyId: baby.id, recordedAtValues: [record.recordedAt], db: tx })
    }
    return { kind: 'health' as const, baby, record: { ...record, toothEruptions: toothEruptions ?? [] } }
  })
}
