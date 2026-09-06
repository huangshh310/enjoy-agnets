/**
 * 未安装 CLI：一键 npm/brew 安装，或复制官方命令。不跑 curl|bash。
 */
import { useState } from "react"
import type { AgentToolId, AgentToolPublic, InstallAgentToolResult } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function AgentCliInstall({
  agent,
  onDone
}: {
  agent: AgentToolPublic
  onDone: () => void
}) {
  const t = useT()
  const [busy, setBusy] = useState<"install" | "login" | null>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")

  async function install() {
    if (!hasIde() || agent.installKind === "copy") return
    setBusy("install")
    setMessage("")
    const result = (await getIde().agentTools.install({
      id: agent.id as AgentToolId
    })) as InstallAgentToolResult
    setBusy(null)
    setMessage(result.message)
    if (result.ok) onDone()
  }

  async function login() {
    if (!hasIde()) return
    setBusy("login")
    setMessage("")
    const result = (await getIde().agentTools.login({ id: agent.id as AgentToolId })) as {
      ok: boolean
      message: string
    }
    setBusy(null)
    setMessage(result.message)
  }

  async function copyCommand() {
    if (!agent.installCommand) return
    await navigator.clipboard.writeText(agent.installCommand)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption-1-medium leading-relaxed text-text-secondary">
        {t("chat.agentMissingHint", { cmd: agent.installCommand || agent.needsLoginHint })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {agent.installKind !== "copy" ? (
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void install()}>
            {busy === "install" ? t("chat.agentInstalling") : t("chat.agentInstall")}
          </Button>
        ) : null}
        {agent.installCommand ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void copyCommand()}>
            {copied ? t("chat.agentInstallCopied") : t("chat.agentInstallCopy")}
          </Button>
        ) : null}
        {agent.docsUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void getIde().agentTools.openDocs({ id: agent.id as AgentToolId })}
          >
            {t("chat.agentDocs")}
          </Button>
        ) : null}
        {agent.status === "ready" ? (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void login()}>
            {busy === "login" ? t("chat.agentLoggingIn") : t("chat.agentLogin")}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-caption-2-medium text-text-tertiary">{message}</p> : null}
    </div>
  )
}
