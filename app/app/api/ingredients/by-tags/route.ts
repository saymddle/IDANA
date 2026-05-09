import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/neo4j'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const tags: string[] = body.tags ?? []
    const countOnly: boolean = body.countOnly ?? false

    if (countOnly) {
      const result = await runQuery(
        `MATCH (i:Ingredient)
         WHERE i.tags IS NOT NULL AND size(i.tags) > 0
         RETURN count(i) AS total`
      )
      const total = result[0]?.get('total')?.toNumber() ?? 0
      return NextResponse.json({ total })
    }

    if (tags.length === 0) {
      return NextResponse.json({ ingredients: [] })
    }

    const records = await runQuery(
      `MATCH (i:Ingredient)
       WHERE i.tags IS NOT NULL
       AND ALL(tag IN $tags WHERE tag IN i.tags)
       RETURN i.name AS name, i.tags AS tags
       ORDER BY i.name
       LIMIT 200`,
      { tags }
    )

    const ingredients = records.map(record => ({
      name: record.get('name') as string,
      tags: record.get('tags') as string[],
      matchCount: tags.filter(t => (record.get('tags') as string[]).includes(t)).length,
    }))

    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error('Tags search error:', error)
    return NextResponse.json({ ingredients: [] })
  }
}
