/**
 * 空态缺口行动作：一键安装或复制命令。失败时交给行内展开，不弹整卡。
 */
import type { AgentToolId, AgentToolPublic, InstallAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { TranslateFn } from "@renderer/i18n"
import type { MissingCtaKind } from "./empty-state-checklist-model"

export async function installMissingAgent(agent: AgentToolPublic): Promise<boolean> {
  if (!hasIde() || agent.installKind === "copy") return false
  const result = (await getIde().agentTools.install({
    id: agent.id as AgentToolId
  })) as InstallAgentToolResult
  return Boolean(result.ok)
}

export async function copyMissingCommand(command: string): Promise<boolean> {
  if (!command) return false
  await navigator.clipboard.writeText(command)
  return true
}

export async function runMissingCta(input: {
  kind: MissingCtaKind
  agent: AgentToolPublic
  onBusy: (busy: boolean) => void
  onCopied: (copied: boolean) => void
  onExpand: () => void
  onInstalled: () => void
}): Promise<void> {
  if (input.kind === "install") {
    input.onBusy(true)
    const ok = await installMissingAgent(input.agent)
    input.onBusy(false)
    if (ok) input.onInstalled()
    else input.onExpand()
    return
  }
  const ok = await copyMissingCommand(input.agent.installCommand)
  if (!ok) {
    input.onExpand()
    return
  }
  input.onCopied(true)
  window.setTimeout(() => input.onCopied(false), 1500)
}

export function missingCtaLabel(
  kind: MissingCtaKind,
  state: { busy: boolean; copied: boolean; t: TranslateFn }
): string {
  if (kind === "install") return state.busy ? state.t("chat.agentInstalling") : state.t("chat.emptyInstall")
  return state.copied ? state.t("chat.emptyCopied") : state.t("chat.emptyCopyCmd")
}
