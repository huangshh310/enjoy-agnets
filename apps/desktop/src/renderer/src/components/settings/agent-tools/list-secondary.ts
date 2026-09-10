/**
 * 助手列次行：版本 · 短路径 / 安装提示。禁止绝对路径、doctor、邮箱。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** 已装 `{version} · bin/xxx`；Enjoy `本地核心 · 内置`；未找到 `— · 安装提示`。 */
export function formatListSecondary(
  tool: Pick<
    AgentToolPublic,
    "id" | "status" | "version" | "detectedPath" | "binaries" | "installKind" | "comingSoon" | "skillOnly"
  >,
  t: Translate
): string {
  if (tool.id === "enjoy-local") return t("settings.agentTools.listEnjoyLine")
  if (tool.comingSoon || tool.skillOnly || tool.status === "comingSoon") {
    return `— · ${t("settings.agentTools.listHintPlanned")}`
  }
  if (tool.status !== "ready") {
    return `— · ${t(installHintKey(tool.installKind))}`
  }
  return `${shortVersion(tool.version)} · ${shortBinPath(tool.detectedPath, tool.binaries)}`
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
  if (!bin) return "bin/—"
  const name = bin.split(/[/\\]/).filter(Boolean).at(-1) || bin
  return `bin/${name}`
}

export function shortVersion(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—"
  const hit = raw.trim().match(/v?\d+(?:\.\d+){0,3}/i)
  if (!hit) return "—"
  return /^v/i.test(hit[0]) ? hit[0] : `v${hit[0]}`
}

function installHintKey(kind: AgentToolPublic["installKind"]): string {
  if (kind === "npm") return "settings.agentTools.listHintNpm"
  if (kind === "brew") return "settings.agentTools.listHintBrew"
  return "settings.agentTools.listHintCopy"
}
