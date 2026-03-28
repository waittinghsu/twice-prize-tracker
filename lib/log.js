const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TEMP_DIR = '/tmp/logs-clone'

function appendLog({ name, drawnCount, beforeRemaining, afterRemaining, detectedAt }) {
  const jst = new Date(detectedAt.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = jst.toISOString().replace('T', ' ').substring(0, 16) + ' JST'
  const entry = `\n## ${dateStr}\n- 商品：${name}\n- 抽出：${drawnCount} 個（${beforeRemaining} → ${afterRemaining}）\n`
  console.log(`  📄 Log entry prepared`)
  return entry
}

function commitAndPush(message, entry) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.warn('  ⚠️  GITHUB_TOKEN not set, skipping git push')
    return
  }

  const repoUrl = `https://${token}@github.com/waittinghsu/twice-prize-tracker.git`

  try {
    // 清除舊的 temp clone
    execSync(`rm -rf ${TEMP_DIR}`, { stdio: 'pipe' })

    // clone logs branch（shallow，只需最新一個 commit）
    execSync(`git clone --branch logs --depth 1 ${repoUrl} ${TEMP_DIR}`, { stdio: 'pipe' })

    // 設定 git user
    execSync(`git -C ${TEMP_DIR} config user.email "bot@twice-prize-tracker.com"`, { stdio: 'pipe' })
    execSync(`git -C ${TEMP_DIR} config user.name "Prize Tracker Bot"`, { stdio: 'pipe' })

    // 寫入 log entry
    fs.appendFileSync(`${TEMP_DIR}/log.md`, entry, 'utf8')

    // commit + push
    execSync(`git -C ${TEMP_DIR} add log.md`, { stdio: 'pipe' })
    execSync(`git -C ${TEMP_DIR} commit -m "${message}"`, { stdio: 'pipe' })
    execSync(`git -C ${TEMP_DIR} push origin logs`, { stdio: 'pipe' })

    console.log(`  🚀 Pushed log.md to GitHub (logs branch)`)
  } catch (err) {
    console.error('  ❌ Git push failed:', err.message)
    if (err.stderr) console.error('  stderr:', err.stderr.toString())
    if (err.stdout) console.error('  stdout:', err.stdout.toString())
  } finally {
    // 清除 temp clone
    try { execSync(`rm -rf ${TEMP_DIR}`, { stdio: 'pipe' }) } catch (_) {}
  }
}

module.exports = { appendLog, commitAndPush }
