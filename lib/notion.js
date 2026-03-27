const { Client } = require('@notionhq/client')

let notion

function getClient() {
  if (!notion) {
    notion = new Client({ auth: process.env.NOTION_TOKEN })
  }
  return notion
}

const STATE_DB_ID = process.env.STATE_DB_ID
const LOG_DB_ID = process.env.LOG_DB_ID

/**
 * Get all rows from Prize State DB
 * @returns {Promise<Array<{pageId: string, name: string, remaining: number|null, total: number|null}>>}
 */
async function getPrizeState() {
  const client = getClient()
  const response = await client.databases.query({ database_id: STATE_DB_ID })

  return response.results.map((page) => ({
    pageId: page.id,
    name: page.properties['商品名稱']?.title?.[0]?.plain_text ?? '',
    remaining: page.properties['剩餘數量']?.number ?? null,
    total: page.properties['總數量']?.number ?? null,
  }))
}

/**
 * Update a Prize State row
 */
async function updatePrizeState(pageId, { remaining, total, lastUpdated }) {
  const client = getClient()
  const properties = {}

  if (remaining !== undefined) properties['剩餘數量'] = { number: remaining }
  if (total !== undefined) properties['總數量'] = { number: total }
  if (lastUpdated !== undefined) {
    properties['最後更新'] = { date: { start: lastUpdated.toISOString() } }
  }

  await client.pages.update({ page_id: pageId, properties })
}

/**
 * Append a Draw Log entry
 */
async function appendDrawLog({ name, drawnCount, beforeRemaining, afterRemaining, detectedAt }) {
  const client = getClient()
  await client.pages.create({
    parent: { database_id: LOG_DB_ID },
    properties: {
      '商品名稱': { title: [{ text: { content: name } }] },
      '抽出數量': { number: drawnCount },
      '減少前剩餘': { number: beforeRemaining },
      '減少後剩餘': { number: afterRemaining },
      '發現時間': { date: { start: detectedAt.toISOString() } },
    },
  })
}

module.exports = { getPrizeState, updatePrizeState, appendDrawLog }
