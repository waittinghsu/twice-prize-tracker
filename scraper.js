require('dotenv').config()

const { fetchPrizeQuantities } = require('./lib/fetch-page')
const { getPrizeState, updatePrizeState, appendDrawLog } = require('./lib/notion')
const { appendLog, commitAndPush } = require('./lib/log')
const { sendTelegram } = require('./lib/telegram')

// Activity ends 2026/4/28 JST
const END_DATE = new Date('2026-04-29T00:00:00+09:00')

async function main() {
  // Check end date
  if (new Date() >= END_DATE) {
    console.log('活動已結束 (2026/4/28)，跳過執行')
    process.exit(0)
  }

  console.log(`[${new Date().toISOString()}] Starting prize tracker...`)

  const now = new Date()

  // 1. Get current state from Notion
  console.log('Reading Prize State from Notion...')
  const stateRows = await getPrizeState()

  // 2. Fetch current quantities from fanpla.jp
  console.log('Fetching prize quantities from fanpla.jp...')
  const current = await fetchPrizeQuantities()

  // 3. Compare and update
  for (const item of current) {
    if (item.remaining === null) {
      console.warn(`  ⚠️  Could not parse quantity for: ${item.name}`)
      continue
    }

    const stateRow = stateRows.find((r) => r.name === item.name)
    if (!stateRow) {
      console.warn(`  ⚠️  No state row found for: ${item.name}`)
      continue
    }

    const prevRemaining = stateRow.remaining

    if (prevRemaining === null) {
      // First run — just record current state, no draw log
      console.log(`  📝 First run for ${item.name}: remaining=${item.remaining}`)
      await updatePrizeState(stateRow.pageId, {
        remaining: item.remaining,
        total: item.total ?? undefined,
        lastUpdated: now,
      })
    } else if (item.remaining < prevRemaining) {
      // Draw detected!
      const drawnCount = prevRemaining - item.remaining
      console.log(`  🎯 Draw detected: ${item.name} — ${prevRemaining} → ${item.remaining} (drawn: ${drawnCount})`)

      await appendDrawLog({
        name: item.name,
        drawnCount,
        beforeRemaining: prevRemaining,
        afterRemaining: item.remaining,
        detectedAt: now,
      })

      appendLog({
        name: item.name,
        drawnCount,
        beforeRemaining: prevRemaining,
        afterRemaining: item.remaining,
        detectedAt: now,
      })

      commitAndPush(`draw: ${item.name} -${drawnCount} (${item.remaining} left)`)

      await sendTelegram({
        name: item.name,
        drawnCount,
        beforeRemaining: prevRemaining,
        afterRemaining: item.remaining,
        detectedAt: now,
      })

      await updatePrizeState(stateRow.pageId, {
        remaining: item.remaining,
        total: item.total ?? undefined,
        lastUpdated: now,
      })
    } else {
      // No change
      console.log(`  ✅ No change: ${item.name} = ${item.remaining}`)
      await updatePrizeState(stateRow.pageId, { lastUpdated: now })
    }
  }

  console.log(`[${new Date().toISOString()}] Done.`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
