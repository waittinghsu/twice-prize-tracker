const { execSync } = require('child_process')

const INTERVAL = 10 * 60 * 1000 // 10 分鐘

function run() {
  console.log(`[${new Date().toISOString()}] Running scraper...`)
  try {
    execSync('node scraper.js', { stdio: 'inherit', cwd: __dirname })
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Scraper error:`, e.message)
  }
}

run() // 啟動時立刻跑一次
setInterval(run, INTERVAL)
