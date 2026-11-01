/**
 * 符号地图预算：默认约 ~1k token（按字符粗估，不引入 tokenizer）。
 */
export const REPO_MAP_TOKEN_BUDGET = 1_000
/** 粗估：英文代码约 4 字符 / token。 */
export const REPO_MAP_CHARS_PER_TOKEN = 4
export const REPO_MAP_CHAR_BUDGET = REPO_MAP_TOKEN_BUDGET * REPO_MAP_CHARS_PER_TOKEN
/** 单文件过大时跳过解析，只保留路径行。 */
export const REPO_MAP_MAX_FILE_CHARS = 200_000
/** 单条签名硬上限。 */
export const REPO_MAP_SIGNATURE_MAX_CHARS = 100
/** 符号模式下最多尝试解析的源文件数。 */
export const REPO_MAP_MAX_SOURCE_FILES = 60

export function charBudgetFromTokens(tokenBudget = REPO_MAP_TOKEN_BUDGET): number {
  return Math.max(0, Math.floor(tokenBudget * REPO_MAP_CHARS_PER_TOKEN))
}
