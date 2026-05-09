#!/usr/bin/env node
/**
 * IDANA — Ingredient Tagger  (Step 1 of 2)
 * ==========================================
 * Pulls all ingredient nodes from Neo4j, sends them in batches to Claude,
 * and writes the tag assignments to idana_ingredient_tags.json for review.
 *
 * Usage:
 *   node tag_ingredients.js
 *
 * After review, run tag_ingredients_write.js to push tags into Neo4j.
 */

import neo4j from 'neo4j-driver'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

// ── Config ─────────────────────────────────────────────────────────────────────
const NEO4J_URI      = 'neo4j+s://619dbf18.databases.neo4j.io'
const NEO4J_USER     = '619dbf18'
const NEO4J_PASSWORD = 'QqnfSPRmYJ-vG6gOSkhUsa79CWpgmUEXi2RIpyh9Wlg'
const NEO4J_DATABASE = '619dbf18'

const BATCH_SIZE  = 60   // ingredients per Claude call
const OUTPUT_FILE = 'idana_ingredient_tags.json'

// ── The complete IDANA tag library ─────────────────────────────────────────────
const TAG_LIBRARY = {
  'Flavor Profile': ['Umami', 'Sweet', 'Salty', 'Sour', 'Bitter', 'Savory', 'Funky', 'Fermented'],
  'Aromatic':       ['Smoky', 'Earthy', 'Floral', 'Herbaceous', 'Citrus-forward', 'Bright', 'Toasty', 'Nutty', 'Pungent'],
  'Texture':        ['Rich', 'Fatty', 'Creamy', 'Crispy', 'Silky', 'Crunchy', 'Tender'],
  'Heat':           ['Mild', 'Medium heat', 'Spicy', 'Fiery', 'Bold', 'Subtle'],
}

const ALL_TAGS = Object.values(TAG_LIBRARY).flat()

const SYSTEM_PROMPT = `You are a professional chef and flavor scientist. 
You assign flavor tags to culinary ingredients based on their known flavor profile.
You ONLY use tags from the provided list. You assign 2-5 tags per ingredient.
You respond ONLY with a valid JSON object — no explanation, no markdown, no backticks.
The JSON must be: { "ingredient_name": ["Tag1", "Tag2", ...], ... }
Only use tags from this list: ${ALL_TAGS.join(', ')}`

// ── Helpers ────────────────────────────────────────────────────────────────────
function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tagBatch(client, ingredients) {
  const prompt = `Assign flavor tags to each of these ingredients.
Return ONLY a JSON object mapping each ingredient name to an array of tags.
Only use tags from the provided list. Assign 2-5 tags per ingredient.

Ingredients:
${ingredients.map(n => `- ${n}`).join('\n')}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip any accidental markdown fences
  const clean = text.replace(/```json\s?/g, '').replace(/```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch (e) {
    console.error('  JSON parse error for batch:', e.message)
    console.error('  Raw response:', text.slice(0, 300))
    return {}
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  IDANA — Ingredient Tagger  (Step 1 of 2)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ── 1. Pull all ingredient names from Neo4j ──
  console.log('STEP 1 — Connecting to Neo4j...')
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))
  const session = driver.session({ database: NEO4J_DATABASE })

  const result = await session.run('MATCH (i:Ingredient) RETURN i.name AS name ORDER BY i.name')
  const allNames = result.records.map(r => r.get('name')).filter(Boolean)
  await session.close()
  await driver.close()

  console.log(`  Found ${allNames.length.toLocaleString()} ingredient nodes\n`)

  // ── 2. Load existing progress if resuming ──
  let existing = {}
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
    const doneCount = Object.keys(existing).length
    console.log(`  Resuming — ${doneCount} already tagged, ${allNames.length - doneCount} remaining\n`)
  }

  const toProcess = allNames.filter(n => !existing[n])

  // ── 3. Tag in batches ──
  console.log(`STEP 2 — Tagging ${toProcess.length} ingredients in batches of ${BATCH_SIZE}...`)
  console.log('  (This will take ~5-8 minutes for 2,900 ingredients)\n')

  const client = new Anthropic()  // uses ANTHROPIC_API_KEY from env
  const batches = chunk(toProcess, BATCH_SIZE)
  let totalTagged = Object.keys(existing).length
  let errors = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} ingredients)... `)

    try {
      const tags = await tagBatch(client, batch)

      // Validate tags — only accept known tag values
      for (const [name, assigned] of Object.entries(tags)) {
        const valid = assigned.filter(t => ALL_TAGS.includes(t))
        if (valid.length > 0) existing[name] = valid
        else existing[name] = []  // ingredient got no valid tags — store empty
      }

      // Fill in any ingredients Claude missed in this batch
      batch.forEach(name => { if (!existing[name]) existing[name] = [] })

      totalTagged = Object.keys(existing).length
      const batchTagged = Object.values(tags).filter(t => t.length > 0).length
      console.log(`✓ ${batchTagged}/${batch.length} tagged`)

    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`)
      errors++
      // Still mark as processed so we don't infinite loop
      batch.forEach(name => { if (!existing[name]) existing[name] = [] })
    }

    // Save progress after every batch (safe to interrupt and resume)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2))

    // Rate limit — pause between batches
    if (i < batches.length - 1) await sleep(800)
  }

  // ── 4. Summary ──
  const withTags    = Object.values(existing).filter(t => t.length > 0).length
  const withoutTags = Object.values(existing).filter(t => t.length === 0).length

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Done. Results saved to ${OUTPUT_FILE}`)
  console.log(`  Total ingredients: ${allNames.length.toLocaleString()}`)
  console.log(`  Tagged (1+ tags):  ${withTags.toLocaleString()}`)
  console.log(`  No tags assigned:  ${withoutTags.toLocaleString()}`)
  if (errors > 0) console.log(`  Batch errors:      ${errors}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nReview idana_ingredient_tags.json then run:')
  console.log('  node tag_ingredients_write.js\n')
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1) })
