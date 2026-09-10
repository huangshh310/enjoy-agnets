/**
 * 助手列次行：只拼 `{version} · {路径短名}`。两者都缺不返回，禁止体检句。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

type Translate = (key: string) => string

/** Enjoy `内置 · —`；有版本或路径才拼行；两者都缺返回 null（不留空行）。 */
export function formatListSecondary(
  tool: Pick<AgentToolPublic, "id" | "status" | "version" | "detectedPath" | "binaries">,
  t: Translate
): string | null {
  if (tool.id === "enjoy-local") return `${t("settings.agentTools.listEnjoyBuiltin")} · —`
  const version = shortVersion(tool.version)
  const path = shortPathFor(tool)
  if (version === "—" && path === "—") return null
  return `${version} · ${path}`
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
  if (!raw?.trim()) return "—"
  const hit = raw.trim().match(/v?\d+(?:\.\d+){0,3}/i)
  if (!hit) return "—"
  return /^v/i.test(hit[0]) ? hit[0] : `v${hit[0]}`
}
