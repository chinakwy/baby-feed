/**
 * Production-safe error logging utility.
 * In production: logs only the error type; ORM messages may contain full request payloads.
 * In development: logs the full error object for debugging.
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    const kind = error instanceof Error && /^[A-Za-z]{1,64}$/.test(error.name) ? error.name : 'Error'
    console.error(`[ERROR] ${context}: ${kind}`)
  } else {
    console.error(`[ERROR] ${context}:`, error)
  }
}
