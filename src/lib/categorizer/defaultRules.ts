import rulesData from '@/lib/defaults/rules.json'

/**
 * Built-in keyword → categoryId mappings (matched case-insensitively, first match wins).
 * Edit `src/lib/defaults/rules.json` to add merchants / keywords for preclassification.
 * Each categoryId must exist in `src/lib/defaults/categories.json`.
 */
export const DEFAULT_KEYWORD_RULES: Array<{ keyword: string; categoryId: string }> =
  rulesData.rules.map((r) => ({
    keyword: r.keyword,
    categoryId: r.categoryId,
  }))
