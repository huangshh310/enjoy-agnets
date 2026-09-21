/**
 * 助手名旁的版本胶囊：有更新时当前灰、最新黄，比次行灰字好扫。
 */
import { formatCliVersion } from "@enjoy-agents/ipc-contract/cli-compat"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { canUpdateCli } from "./cli-outdated/cli-outdated-copy"

export function AgentToolVersionPill({ tool }: { tool: AgentToolPublic }) {
  const current = formatCliVersion(tool.version ?? tool.authAccount?.cliVersion)
  if (current === "—") return null
  const latest = formatCliVersion(tool.latestVersion)
  const behind = canUpdateCli(tool) && latest !== "—"
  if (behind) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-status-yellow-text/35 bg-status-yellow-text/10 px-2 py-0.5 font-mono text-caption-2-medium tabular-nums"
        title={`${current} → ${latest}`}
      >
        <span className="text-text-secondary">{current}</span>
        <span className="text-status-yellow-text">→</span>
        <span className="font-semibold text-status-yellow-text">{latest}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium tabular-nums text-text-secondary">
      {current}
    </span>
  )
}
