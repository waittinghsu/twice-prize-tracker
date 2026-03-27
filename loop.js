const { execSync } = require('child_process')
const http = require('http')

const INTERVAL = 10 * 60 * 1000 // 10 分鐘
const PORT = process.env.PORT || 3000
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || ''

let isRunning = false

function run() {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] Scraper already running, skipping...`)
    return
  }
  isRunning = true
  console.log(`[${new Date().toISOString()}] Running scraper...`)
  try {
    execSync('node scraper.js', { stdio: 'inherit', cwd: __dirname })
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Scraper error:`, e.message)
  } finally {
    isRunning = false
  }
}

// HTTP server：health check + webhook 手動觸發
const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    return res.end('ok')
  }

  // Webhook 觸發
  if ((req.method === 'POST' || req.method === 'GET') && req.url.startsWith('/trigger')) {
    const token = new URL(req.url, `http://localhost`).searchParams.get('token')
    if (WEBHOOK_TOKEN && token !== WEBHOOK_TOKEN) {
      res.writeHead(401)
      return res.end('unauthorized')
    }
    res.writeHead(200)
    res.end('triggered')
    run()
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`)
})

// 啟動時初始化：同步 main，切換到 logs branch
function initBranch() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.warn('[init] GITHUB_TOKEN not set, skipping branch init')
    return
  }
  try {
    const REPO_DIR = __dirname
    execSync(`git -C "${REPO_DIR}" remote set-url origin https://${token}@github.com/waittinghsu/twice-prize-tracker.git`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" config user.email "bot@twice-prize-tracker.com"`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" config user.name "Prize Tracker Bot"`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" fetch origin main:refs/remotes/origin/main logs:refs/remotes/origin/logs`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" merge origin/main --no-edit`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" checkout -B logs origin/logs`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" merge main --no-edit`, { stdio: 'pipe' })
    console.log('[init] Switched to logs branch, synced with main')
  } catch (err) {
    console.error('[init] Branch init failed:', err.message)
  }
}

initBranch()
run() // 啟動時立刻跑一次
setInterval(run, INTERVAL)
