#!/usr/bin/env node
/**
 * IDANA — Ingredient Tagger  (Step 2 of 2)
 * ==========================================
 * Reads idana_ingredient_tags.json and writes the tags
 * as a `tags` property on each Ingredient node in Neo4j.
 *
 * Run ONLY after reviewing the JSON from step 1:
 *   node tag_ingredients_write.js
 *
 * Safe to re-run — uses MERGE so existing tags are overwritten not duplicated.
 */

import neo4j from 'neo4j-driver'
import fs from 'fs'

const NEO4J_URI      = 'neo4j+s://619dbf18.databases.neo4j.io'
const NEO4J_USER     = '619dbf18'
const NEO4J_PASSWORD = 'QqnfSPRmYJ-vG6gOSkhUsa79CWpgmUEXi2RIpyh9Wlg'
const NEO4J_DATABASE = '619dbf18'

const INPUT_FILE = 'idana_ingredient_tags.json'
const BATCH_SIZE = 500

function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  IDANA — Tag Writer  (Step 2 of 2)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: ${INPUT_FILE} not found. Run tag_ingredients.js first.`)
    process.exit(1)
  }

  const tagMap = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))
  const entries = Object.entries(tagMap)
  console.log(`  Loaded ${entries.length.toLocaleString()} ingredient tag assignments`)

  const withTags    = entries.filter(([, t]) => t.length > 0).length
  const withoutTags = entries.filter(([, t]) => t.length === 0).length
  console.log(`  With tags:    ${withTags.toLocaleString()}`)
  console.log(`  Without tags: ${withoutTags.toLocaleString()}\n`)

  console.log('STEP 1 — Connecting to Neo4j...')
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))
  const session = driver.session({ database: NEO4J_DATABASE })

  // Convert to array of {name, tags} objects
  const records = entries.map(([name, tags]) => ({ name, tags }))
  const batches = chunk(records, BATCH_SIZE)

  console.log(`STEP 2 — Writing tags in ${batches.length} batches...\n`)

  let written = 0
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    process.stdout.write(`  Batch ${i + 1}/${batches.length}... `)

    await session.run(
      `UNWIND $batch AS row
       MATCH (i:Ingredient)
       WHERE toLower(i.name) = toLower(row.name)
       SET i.tags = row.tags`,
      { batch }
    )

    written += batch.length
    console.log(`✓ ${written.toLocaleString()} / ${records.length.toLocaleString()}`)
  }

  // Verify
  const check = await session.run(
    'MATCH (i:Ingredient) WHERE i.tags IS NOT NULL AND size(i.tags) > 0 RETURN count(i) AS tagged'
  )
  const taggedCount = check.records[0].get('tagged').toNumber()

  await session.close()
  await driver.close()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Tags written to Neo4j`)
  console.log(`  Verified: ${taggedCount.toLocaleString()} ingredients now have tags`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1) })
