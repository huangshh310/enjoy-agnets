/**
 * 助手列次行：只拼 `{version} · {路径短名}`。过旧例外见 P0-E。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { formatCliVersion } from "@enjoy-agents/ipc-contract/cli-compat"
import { cliCompatOf, formatOutdatedSecondary } from "./cli-outdated/cli-outdated-copy.ts"

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** Enjoy `— · 内置`；过旧写「需更新 · v1.2（要 ≥1.5）」；其余 `版本 · 短路径`。 */
export function formatListSecondary(
  tool: Pick<
    AgentToolPublic,
    | "id"
    | "status"
    | "version"
    | "detectedPath"
    | "binaries"
    | "requiredVersion"
    | "authAccount"
    | "latestVersion"
  >,
  t: Translate
): string {
  if (tool.id === "enjoy-local") return `— · ${t("settings.agentTools.listEnjoyBuiltin")}`
  const compat = cliCompatOf(tool)
  if (compat.kind === "outdated") return formatOutdatedSecondary(compat, t)
  return `${shortVersion(tool.version)} · ${shortPathFor(tool)}`
}

function shortPathFor(
  tool: Pick<AgentToolPublic, "status" | "detectedPath" | "binaries">
): string {
  if (tool.detectedPath?.trim()) return shortBinPath(tool.detectedPath, tool.binaries)
  if (tool.status === "ready") return shortBinPath(null, tool.binaries)
  return "—"
}

/** 只回 `bin/name` 或末两段；永不回绝对路径。 */
export function shortBinPath(detectedPath: string | null | undefined, binaries: readonly string[] = []): string {
  const trimmed = detectedPath?.trim()
  if (trimmed) {
    const parts = trimmed.split(/[/\\]/).filter(Boolean)
    const name = parts.at(-1) || "cli"
    const parent = parts.at(-2)
    if (parent === "bin") return `bin/${name}`
    if (parts.length >= 2) return `${parent}/${name}`
    return `bin/${name}`
  }
  const bin = binaries[0]?.trim()
  if (!bin) return "—"
  const name = bin.split(/[/\\]/).filter(Boolean).at(-1) || bin
  return `bin/${name}`
}

export function shortVersion(raw: string | null | undefined): string {
  return formatCliVersion(raw)
}
