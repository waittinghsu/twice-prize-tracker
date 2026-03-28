require('dotenv').config({ override: true })
const { execSync } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { getPrizeState, getDrawLog } = require('./lib/notion')

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

// HTTP server：health check + webhook 手動觸發 + API
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`)

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200)
    return res.end('ok')
  }

  // Webhook 觸發
  if ((req.method === 'POST' || req.method === 'GET') && url.pathname === '/trigger') {
    const token = url.searchParams.get('token')
    if (WEBHOOK_TOKEN && token !== WEBHOOK_TOKEN) {
      res.writeHead(401)
      return res.end('unauthorized')
    }
    res.writeHead(200)
    res.end('triggered')
    run()
    return
  }

  // API: Draw Log
  if (req.method === 'GET' && url.pathname === '/api/draws') {
    try {
      const draws = await getDrawLog()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      return res.end(JSON.stringify(draws))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: err.message }))
    }
  }

  // API: Prize State
  if (req.method === 'GET' && url.pathname === '/api/state') {
    try {
      const state = await getPrizeState()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      return res.end(JSON.stringify(state))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: err.message }))
    }
  }

  // 前端頁面
  if (req.method === 'GET' && url.pathname === '/') {
    const htmlPath = path.join(__dirname, 'public', 'index.html')
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(fs.readFileSync(htmlPath))
    }
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`)
})

run() // 啟動時立刻跑一次
setInterval(run, INTERVAL)
