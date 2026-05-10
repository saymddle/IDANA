export interface Pairing {
  name: string
  score: number
  emphasis: boolean
  matchCount?: number
}

export async function fetchPairings(ingredientName: string): Promise<Pairing[]> {
  try {
    const res = await fetch(`/api/ingredient/${encodeURIComponent(ingredientName.trim())}`)
    const data = await res.json()
    return data.found ? data.pairings : []
  } catch {
    return []
  }
}

/**
 * Compute hub pairings across N ingredients using adaptive threshold.
 *
 * Threshold: Math.max(2, Math.floor(N * 0.6))
 *   2 ingredients → min 2 matches
 *   3 ingredients → min 2 matches
 *   5 ingredients → min 3 matches
 *   6 ingredients → min 4 matches
 *
 * Pairings below threshold are included (capped to score ≤1.0) when
 * includeSubThreshold=true, showing as "Interesting Twists".
 */
export async function computeHubPairings(
  hubIngredients: string[],
  includeSubThreshold = true
): Promise<Pairing[]> {
  if (hubIngredients.length === 0) return []
  if (hubIngredients.length === 1) return fetchPairings(hubIngredients[0])

  const N = hubIngredients.length
  const threshold = Math.max(2, Math.floor(N * 0.6))

  const allPairings = await Promise.all(hubIngredients.map(fetchPairings))

  const countMap = new Map<string, {
    count: number
    scoreSum: number
    emphasis: boolean
    canonical: string
  }>()

  allPairings.forEach(pairings => {
    pairings.forEach(p => {
      const lower = p.name.toLowerCase()
      const ex = countMap.get(lower)
      if (ex) {
        ex.count++
        ex.scoreSum += p.score
        if (p.emphasis) ex.emphasis = true
      } else {
        countMap.set(lower, { count: 1, scoreSum: p.score, emphasis: p.emphasis, canonical: p.name })
      }
    })
  })

  const aboveThreshold: Pairing[] = []
  const belowThreshold: Pairing[] = []

  countMap.forEach(({ count, scoreSum, emphasis, canonical }) => {
    const avgScore = scoreSum / count
    const boostedScore = avgScore + (count - 1) * 0.05
    const pairing: Pairing = { name: canonical, score: boostedScore, emphasis, matchCount: count }

    if (count >= threshold) {
      aboveThreshold.push(pairing)
    } else if (includeSubThreshold) {
      belowThreshold.push({ ...pairing, score: Math.min(pairing.score, 1.0) })
    }
  })

  aboveThreshold.sort((a, b) => b.score - a.score)
  belowThreshold.sort((a, b) => b.score - a.score)

  return [...aboveThreshold, ...belowThreshold.slice(0, 15)]
}
