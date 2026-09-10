/**
 * 来源芯片文案：按 catalog id 查表，禁止 claude ? … : Codex。
 */
import type { CliUsageSource, CliUsageSourceId } from "@enjoy-agents/ipc-contract"

export const SOURCE_NAME_KEY: Record<CliUsageSourceId, `cliUsageSource.${CliUsageSourceId}`> = {
  claude: "cliUsageSource.claude",
  cursor: "cliUsageSource.cursor",
  grok: "cliUsageSource.grok",
  codex: "cliUsageSource.codex",
  antigravity: "cliUsageSource.antigravity",
  gemini: "cliUsageSource.gemini",
  opencode: "cliUsageSource.opencode",
  pi: "cliUsageSource.pi",
  hermes: "cliUsageSource.hermes",
  amp: "cliUsageSource.amp",
  deepseek: "cliUsageSource.deepseek",
  omp: "cliUsageSource.omp"
}

export function sourceNameKey(id: CliUsageSourceId): `pages.observability.cliUsageSource.${CliUsageSourceId}` {
  return `pages.observability.${SOURCE_NAME_KEY[id]}`
}

export function sourceChipStatusKey(
  source: CliUsageSource
):
  | "pages.observability.cliUsageChipHasUsage"
  | "pages.observability.cliUsageChipMissing"
  | "pages.observability.cliUsageChipEmptyDir"
  | "pages.observability.cliUsageChipNoFields"
  | "pages.observability.cliUsageChipUnsupported" {
  if (source.status === "has-usage") return "pages.observability.cliUsageChipHasUsage"
  if (source.status === "directory-missing") return "pages.observability.cliUsageChipMissing"
  if (source.status === "unsupported") return "pages.observability.cliUsageChipUnsupported"
  return source.fileCount > 0
    ? "pages.observability.cliUsageChipNoFields"
    : "pages.observability.cliUsageChipEmptyDir"
}

export function catalogChipIds(): CliUsageSourceId[] {
  return Object.keys(SOURCE_NAME_KEY) as CliUsageSourceId[]
}
