const puppeteer = require('puppeteer')

const TARGET_URL = 'https://chance.fanpla.jp/twice/471'

const PRIZE_NAMES = [
  '終演後お見送り会',
  '直筆サイン入り ユニットポラ',
  '直筆サイン入り ソロポラ',
  '直筆サイン入り OFFICIAL GOODS',
]

/**
 * Fetch current prize quantities from fanpla.jp
 * @returns {Promise<Array<{name: string, remaining: number, total: number}>>}
 */
async function fetchPrizeQuantities() {
  let browser
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    console.log(`Navigating to ${TARGET_URL}...`)
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for prize items to load
    await page.waitForSelector('body', { timeout: 10000 })

    // Extract page text for debugging
    const pageText = await page.evaluate(() => document.body.innerText)

    const results = []

    for (const name of PRIZE_NAMES) {
      // Look for pattern like "残り16本 / 18本" near the prize name
      const remaining = extractRemaining(pageText, name)
      const total = extractTotal(pageText, name)
      results.push({ name, remaining, total })
      console.log(`  ${name}: ${remaining} / ${total}`)
    }

    return results
  } finally {
    if (browser) await browser.close()
  }
}

function extractRemaining(text, prizeName) {
  // Find the section for this prize and extract "残りXX本"
  const lines = text.split('\n')
  let foundPrize = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(prizeName)) {
      foundPrize = true
    }
    if (foundPrize) {
      // Look for "残りX本" pattern within next 10 lines
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        const match = lines[j].match(/残り(\d+)本/)
        if (match) return parseInt(match[1], 10)
      }
      // If not found within 10 lines, stop looking for this prize
      if (i > lines.indexOf(prizeName) + 10) break
    }
  }
  return null
}

function extractTotal(text, prizeName) {
  const lines = text.split('\n')
  let foundPrize = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(prizeName)) {
      foundPrize = true
    }
    if (foundPrize) {
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        // Pattern: "残りX本 / Y本" or "/ Y本"
        const match = lines[j].match(/\/\s*(\d+)本/)
        if (match) return parseInt(match[1], 10)
      }
      if (i > lines.indexOf(prizeName) + 10) break
    }
  }
  return null
}

module.exports = { fetchPrizeQuantities }
