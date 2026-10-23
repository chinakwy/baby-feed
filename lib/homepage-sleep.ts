interface SleepRecord { type: string; sleepStartTime?: string | null; sleepEndTime?: string | null }
/** Clip to the Beijing calendar day, counting overlapping time only once. */
export function summarizeHomepageSleep(records: SleepRecord[], date: string, now = Date.now()) {
  const dayStart = Date.parse(`${date}T00:00:00+08:00`)
  const dayEnd = dayStart + 86400000
  const intervals: [number, number][] = []
  let sleeping = false
  for (const record of records) {
    if (record.type !== 'SLEEP' || !record.sleepStartTime) continue
    const start = Date.parse(record.sleepStartTime)
    const end = record.sleepEndTime ? Date.parse(record.sleepEndTime) : now
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || start >= dayEnd || end < dayStart) continue
    const left = Math.max(start, dayStart), right = Math.min(end, dayEnd)
    if (right < left || (right === left && !!record.sleepEndTime)) continue
    intervals.push([left,right])
    if (!record.sleepEndTime && start <= now && now >= dayStart && now < dayEnd) sleeping = true
  }
  intervals.sort((a,b) => a[0]-b[0])
  let total = 0, previousEnd = -Infinity
  for (const [start,end] of intervals) { total += Math.max(0,end-Math.max(start,previousEnd)); previousEnd = Math.max(previousEnd,end) }
  return { sleepMinutes: Math.floor(total/60000), sleepCount: intervals.length, sleeping }
}
export function formatSleepMinutes(minutes: number) {
  const value = Math.max(0,Math.floor(minutes))
  return value >= 60 ? `${Math.floor(value/60)}小时${value%60 ? `${value%60}分钟` : ''}` : `${value}分钟`
}
