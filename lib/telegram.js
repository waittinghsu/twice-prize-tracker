const https = require('https')

async function sendTelegram({ name, drawnCount, beforeRemaining, afterRemaining, detectedAt }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('  ⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping')
    return
  }

  const jst = new Date(detectedAt.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = jst.toISOString().replace('T', ' ').substring(0, 16) + ' JST'

  const text = [
    `🎯 抽獎偵測！`,
    `商品：${name}`,
    `抽出：${drawnCount} 個（${beforeRemaining} → ${afterRemaining}）`,
    `時間：${dateStr}`,
  ].join('\n')

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text })
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('  📨 Telegram sent')
            resolve()
          } else {
            console.error(`  ❌ Telegram failed: ${data}`)
            resolve()
          }
        })
      }
    )
    req.on('error', (err) => {
      console.error('  ❌ Telegram error:', err.message)
      resolve()
    })
    req.write(body)
    req.end()
  })
}

module.exports = { sendTelegram }
