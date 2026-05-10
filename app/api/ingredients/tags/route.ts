import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/neo4j'

export async function POST(request: Request) {
  try {
    const { ingredients } = await request.json()

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ tags: [] })
    }

    const records = await runQuery(
      `UNWIND $names AS name
       MATCH (i:Ingredient)
       WHERE toLower(i.name) = toLower(name)
       AND i.tags IS NOT NULL AND size(i.tags) > 0
       RETURN i.tags AS tags`,
      { names: ingredients }
    )

    const allTags = new Set<string>()
    records.forEach(record => {
      const tags = record.get('tags') as string[]
      tags.forEach(t => allTags.add(t))
    })

    return NextResponse.json({ tags: Array.from(allTags) })
  } catch (error) {
    console.error('Ingredient tags error:', error)
    return NextResponse.json({ tags: [] })
  }
}
