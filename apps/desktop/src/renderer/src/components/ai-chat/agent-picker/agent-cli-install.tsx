/**
 * 未安装 CLI：命令单独成块，一键安装通栏，扫描和说明放在下面。
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
  const actions = useInstallActions(agent, onDone)
  const canOneClick = agent.installKind !== "copy"
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 px-3 py-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default">
          <AgentBrandIcon id={agent.id} size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">{agent.label}</span>
        <ReadinessMark kind="missing" label={t("chat.agentNotInstalledMark")} />
      </div>
      <p className="text-caption-1-regular text-text-secondary">{t("chat.agentMissingBody")}</p>
      {agent.installCommand ? (
        <InstallCommand command={agent.installCommand} copied={actions.copied} onCopy={() => void actions.copyCommand()} />
      ) : null}
      {canOneClick ? (
        <Button type="button" size="sm" className="w-full" disabled={actions.busy !== null} onClick={() => void actions.install()}>
          {actions.busy === "install" ? t("chat.agentInstalling") : t("chat.agentInstall")}
        </Button>
      ) : null}
      <InstallLinks
        busy={actions.busy}
        docs={Boolean(agent.docsUrl)}
        onRescan={() => void actions.rescan()}
        onDocs={() => void getIde().agentTools.openDocs({ id: agent.id as AgentToolId })}
      />
      {actions.message ? <p className="text-caption-2-medium text-text-tertiary">{actions.message}</p> : null}
    </div>
  )
}

function useInstallActions(agent: AgentToolPublic, onDone: () => void) {
  const [busy, setBusy] = useState<"install" | "detect" | null>(null)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")

  async function install() {
    if (!hasIde() || agent.installKind === "copy") return
    setBusy("install")
    setMessage("")
    const result = (await getIde().agentTools.install({ id: agent.id as AgentToolId })) as InstallAgentToolResult
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

  return { busy, copied, message, install, rescan, copyCommand }
}

function InstallCommand({
  command,
  copied,
  onCopy
}: {
  command: string
  copied: boolean
  onCopy: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background-secondary-default px-2.5 py-2">
      <code className="min-w-0 flex-1 truncate font-mono text-caption-2-medium text-text-primary" title={command}>
        {command}
      </code>
      <button type="button" className="shrink-0 text-caption-2-medium text-accent-600" onClick={onCopy}>
        {copied ? t("chat.agentInstallCopied") : t("chat.copyCommand")}
      </button>
    </div>
  )
}

function InstallLinks({
  busy,
  docs,
  onRescan,
  onDocs
}: {
  busy: "install" | "detect" | null
  docs: boolean
  onRescan: () => void
  onDocs: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        disabled={busy !== null}
        className="text-caption-2-medium text-text-secondary hover:text-text-primary disabled:opacity-40"
        onClick={onRescan}
      >
        {busy === "detect" ? t("chat.agentScanning") : t("chat.agentRescan")}
      </button>
      {docs ? (
        <button type="button" className="text-caption-2-medium text-accent-600 hover:underline" onClick={onDocs}>
          {t("chat.agentDocs")}
        </button>
      ) : null}
    </div>
  )
}
