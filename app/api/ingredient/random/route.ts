import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/neo4j'

export async function GET() {
  try {
    const records = await runQuery(
      `MATCH (i:Ingredient)
       WHERE (i)-[:PAIRS_WITH]-()
       RETURN i.name AS name
       ORDER BY rand()
       LIMIT 1`
    )
    if (records.length === 0) {
      return NextResponse.json({ name: null })
    }
    const raw  = records[0].get('name') as string
    const name = raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    return NextResponse.json({ name })
  } catch (err) {
    console.error('Random ingredient error:', err)
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
  }
}
