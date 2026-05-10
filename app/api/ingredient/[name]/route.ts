import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/neo4j'

// Known noise nodes to filter from results
const NOISE_NODES = new Set([
  'avoid', 'freshness', 'bouillabaisse', 'wine', 'oil', 'salt',
])

function formatName(name: string): string {
  // Title-case the ingredient name for display
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rawName } = await params
  const name = decodeURIComponent(rawName).trim()

  try {
    const records = await runQuery(
      `MATCH (i:Ingredient)
       WHERE toLower(i.name) = toLower($name)
       MATCH (i)-[r:PAIRS_WITH]-(p:Ingredient)
       RETURN p.name AS pairing, r.score AS score, r.emphasis AS emphasis
       ORDER BY r.score DESC, p.name ASC
       LIMIT 60`,
      { name }
    )

    if (records.length === 0) {
      // Try partial match if exact match returns nothing
      const fuzzyRecords = await runQuery(
        `MATCH (i:Ingredient)
         WHERE toLower(i.name) CONTAINS toLower($name)
         MATCH (i)-[r:PAIRS_WITH]-(p:Ingredient)
         WITH i, p, r
         RETURN i.name AS matched, p.name AS pairing, r.score AS score, r.emphasis AS emphasis
         ORDER BY r.score DESC
         LIMIT 60`,
        { name }
      )

      if (fuzzyRecords.length === 0) {
        return NextResponse.json({ ingredient: name, pairings: [], found: false })
      }

      const matched = fuzzyRecords[0].get('matched') as string
      const pairings = fuzzyRecords
        .map(record => ({
          name: formatName(record.get('pairing') as string),
          score: record.get('score') as number,
          emphasis: record.get('emphasis') as boolean,
        }))
        .filter(p => !NOISE_NODES.has(p.name.toLowerCase()))

      return NextResponse.json({
        ingredient: formatName(matched),
        pairings,
        found: true,
        fuzzy: true,
      })
    }

    const pairings = records
      .map(record => ({
        name: formatName(record.get('pairing') as string),
        score: record.get('score') as number,
        emphasis: record.get('emphasis') as boolean,
      }))
      .filter(p => !NOISE_NODES.has(p.name.toLowerCase()))

    return NextResponse.json({
      ingredient: formatName(name),
      pairings,
      found: true,
      fuzzy: false,
    })
  } catch (error) {
    console.error('Neo4j query error:', error)
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
  }
}