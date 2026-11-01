export {
  buildRepoMap,
  getLastRepoMapOccupancy,
  resetLastRepoMapOccupancyForTests,
  clearRepoMapParseCache,
  type BuildRepoMapOptions,
  type BuildRepoMapResult,
  type RepoMapOccupancy
} from "./build-repo-map.ts"
export { SYMBOL_MAP_UNAVAILABLE_NOTE, directoryModeBanner } from "./degrade.ts"
export {
  REPO_MAP_TOKEN_BUDGET,
  REPO_MAP_CHAR_BUDGET,
  charBudgetFromTokens
} from "./budgets.ts"
export { formatSymbolMap } from "./format-symbol-map.ts"
export { resetWasmHostForTests, ensureWasmReady } from "./wasm-host.ts"
export { grammarForPath, GRAMMAR_VERSION } from "./languages.ts"
export { rankByRelevance, identifiersFromSignatures, scoresFromNameOnlyLog } from "./relevance.ts"
export {
  getCachedSignatures,
  makeParseCacheKey,
  repoMapParseCacheSizeForTests
} from "./parse-cache.ts"
