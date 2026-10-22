import { invalidateRequestCache } from '@/lib/client-request-cache'

export const RECORDS_CHANGED_EVENT = 'baby-feed:records-changed'

/**
 * 清除与指定宝宝相关的所有客户端请求缓存
 * 在创建/更新/删除喂养或健康记录后调用
 */
export function invalidateRecordRelatedCaches(babyId: string) {
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('record_saved_ts', String(Date.now()))
    } catch {
      // Cache invalidation must still work when the browser blocks storage.
    }
  }
  invalidateRequestCache(`/api/babies`)
  invalidateRequestCache(`/api/feeding?babyId=${babyId}`)
  invalidateRequestCache(`/api/health?babyId=${babyId}`)
  invalidateRequestCache(`stats:${babyId}:`)
  invalidateRequestCache(`timeline:${babyId}:`)
  invalidateRequestCache(`timeline-dates:${babyId}`)
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(RECORDS_CHANGED_EVENT, { detail: { babyId } }))
  }
}
