/**
 * 未安装 CLI：主按钮一键安装，次按钮复制命令，文档走链接。无装饰粉边。
 */
import { useState } from "react"
import type { AgentToolId, AgentToolPublic, InstallAgentToolResult } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "./agent-brand-icon"
import { ReadinessMark } from "./readiness-mark"

export function AgentCliInstall({
  agent,
  onDone
}: {
  agent: AgentToolPublic
  onDone: () => void
}) {
  const t = useT()
  const [busy, setBusy] = useState<"install" | "detect" | null>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const canOneClick = agent.installKind !== "copy"

  async function install() {
    if (!hasIde() || !canOneClick) return
    setBusy("install")
    setMessage("")
    const result = (await getIde().agentTools.install({
      id: agent.id as AgentToolId
    })) as InstallAgentToolResult
    setBusy(null)
    setMessage(result.message)
    if (result.ok) onDone()
  }

  async function rescan() {
    if (!hasIde()) return
    setBusy("detect")
    setMessage("")
    await getIde().agentTools.detect()
    setBusy(null)
    onDone()
  }

  async function copyCommand() {
    if (!agent.installCommand) return
    await navigator.clipboard.writeText(agent.installCommand)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default">
          <AgentBrandIcon id={agent.id} size={16} />
        </span>
        <span className="min-w-0 truncate text-body-medium text-text-primary">{agent.label}</span>
        <ReadinessMark kind="missing" label={t("chat.agentNotInstalledMark")} />
      </div>
      <p className="text-caption-1-regular leading-relaxed text-text-secondary">
        {t("chat.agentMissingHint", { cmd: agent.installCommand || agent.needsLoginHint })}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {canOneClick ? (
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void install()}>
            {busy === "install" ? t("chat.agentInstalling") : t("chat.agentInstall")}
          </Button>
        ) : null}
        {agent.installCommand ? (
          <Button
            type="button"
            size="sm"
            variant={canOneClick ? "outline" : "default"}
            onClick={() => void copyCommand()}
          >
            {copied ? t("chat.agentInstallCopied") : t("chat.agentInstallCopy")}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void rescan()}>
          {busy === "detect" ? t("chat.agentScanning") : t("chat.agentRescan")}
        </Button>
      </div>
      {agent.docsUrl ? (
        <button
          type="button"
          className="self-start text-caption-2-medium text-accent-500 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          onClick={() => void getIde().agentTools.openDocs({ id: agent.id as AgentToolId })}
        >
          {t("chat.agentDocs")}
        </button>
      ) : null}
      {message ? <p className="text-caption-2-medium text-text-tertiary">{message}</p> : null}
    </div>
  )
}
