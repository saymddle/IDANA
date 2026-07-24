// Category → accent color. Shared by Sessions, Profile, Home cards and the
// Brief drawer so category accents stay consistent across the app.
export const CATEGORY_COLORS: Record<string, string> = {
  Desserts:  '#8B5E3C',
  Sides:     '#5A7A4A',
  Sauces:    '#C0394B',
  Mains:     '#D4622A',
  Soups:     '#3B4A8A',
  Salads:    '#5A7A4A',
  Burgers:   '#D4622A',
  Breakfast: '#C89B3C',
  Drinks:    '#3B4A8A',
  Snacks:    '#8B5E3C',
  Other:     '#6B5D50',
}

const FALLBACK = '#6B5D50'

interface SessionLike {
  category?: string | null
  tags?: string[] | null
}

// A session's category is the first-class column when present, otherwise the
// legacy convention (tags[0]) so pre-migration rows still render an accent.
export function sessionCategory(s: SessionLike): string | null {
  return s.category ?? s.tags?.[0] ?? null
}

export function categoryColor(category?: string | null): string {
  if (!category) return FALLBACK
  return CATEGORY_COLORS[category] ?? FALLBACK
}
