// No database access or payload logging; serial calls avoid overlapping ticks.
if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
for (;;) {
  try {
    const response = await fetch('http://baby-feed:3000/api/cron/webhook-runner', {
      headers: {Authorization: `Bearer ${process.env.CRON_SECRET}`},
      signal: AbortSignal.timeout(1_800_000),
    })
    await response.body?.cancel()
    if (!response.ok) console.error('Webhook runner HTTP', response.status)
  } catch { console.error('Webhook runner request failed') }
  await new Promise(resolve=>setTimeout(resolve,60_000))
}
