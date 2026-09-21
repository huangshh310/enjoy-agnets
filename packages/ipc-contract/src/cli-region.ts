/**
 * 本机 CLI 地域分组：设置「智能体」页国外 / 国产筛选。
 * Enjoy 本地与自定义 ACP 不属于任一地域，只出现在全部 / 安装态。
 */
export type CliRegion = "international" | "domestic"

/** 国外 / 国际厂商本机 CLI。 */
export const INTERNATIONAL_CLI_IDS = [
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "omp",
  "hermes",
  "amp",
  "droid",
  "devin"
] as const

/** 国产 / 国内厂商本机 CLI。 */
export const DOMESTIC_CLI_IDS = [
  "deepseek",
  "qwen",
  "kimi",
  "codebuddy",
  "glm",
  "minimax",
  "qoder"
] as const

const INTERNATIONAL = new Set<string>(INTERNATIONAL_CLI_IDS)
const DOMESTIC = new Set<string>(DOMESTIC_CLI_IDS)

/** 内置 CLI 的地域；Enjoy 本地、自定义、未知 id 回 null。 */
export function cliRegionOf(id: string | undefined): CliRegion | null {
  if (!id) return null
  if (INTERNATIONAL.has(id)) return "international"
  if (DOMESTIC.has(id)) return "domestic"
  return null
}
