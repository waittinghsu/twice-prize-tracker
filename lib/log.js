const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const LOG_PATH = path.join(__dirname, '..', 'log.md')
const REPO_DIR = path.join(__dirname, '..')

function appendLog({ name, drawnCount, beforeRemaining, afterRemaining, detectedAt }) {
  // Format time in JST
  const jst = new Date(detectedAt.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = jst.toISOString().replace('T', ' ').substring(0, 16) + ' JST'

  const entry = `\n## ${dateStr}\n- 商品：${name}\n- 抽出：${drawnCount} 個（${beforeRemaining} → ${afterRemaining}）\n`

  fs.appendFileSync(LOG_PATH, entry, 'utf8')
  console.log(`  📄 Written to log.md`)
}

function commitAndPush(message) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.warn('  ⚠️  GITHUB_TOKEN not set, skipping git push')
    return
  }

  try {
    // 已在 logs branch（由 loop.js initBranch 保證），直接 commit push
    execSync(`git -C "${REPO_DIR}" add log.md`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" commit -m "${message}"`, { stdio: 'pipe' })
    execSync(`git -C "${REPO_DIR}" push origin logs`, { stdio: 'pipe' })
    console.log(`  🚀 Pushed log.md to GitHub`)
  } catch (err) {
    console.error('  ❌ Git push failed:', err.message)
    if (err.stderr) console.error('  stderr:', err.stderr.toString())
    if (err.stdout) console.error('  stdout:', err.stdout.toString())
  }
}

module.exports = { appendLog, commitAndPush }
