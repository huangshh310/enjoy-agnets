/**
 * Registry 详情：说明、command/args 预览、安装或复制、文档外开。
 */
import { RiExternalLinkLine, RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { RegistryRow } from "./acp-registry.types"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { useState } from "react"

export function AcpRegistryDetail({
  row,
  onInstalled
}: {
  row: RegistryRow | undefined
  onInstalled: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!row) {
    return (
      <div className="rounded-xl border border-dashed border-border-button-default px-4 py-8 text-caption-1-regular text-text-tertiary">
        {t("settings.registry.emptyDetail")}
      </div>
    )
  }
  const { tool, commandPreview } = row
  const summary = registrySummary(tool.id, t) || tool.needsLoginHint
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-button-default bg-background-primary-default p-4">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{tool.label}</h3>
        <p className="mt-1 text-caption-1-regular text-text-secondary">{summary}</p>
      </div>
      <p className="rounded-lg bg-background-secondary-default/60 px-3 py-2 font-mono text-caption-2-medium text-text-secondary">
        {commandPreview || "—"}
      </p>
      {error ? <p className="text-caption-1-medium text-text-error-primary">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {tool.installKind !== "copy" && row.status !== "comingSoon" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void runInstall(tool.id, setBusy, setError, onInstalled)}
            className="text-caption-1-medium"
          >
            {busy ? t("settings.agentTools.installing") : t("settings.agentTools.install")}
          </Button>
        ) : null}
        {tool.installCommand ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copyText(tool.installCommand, setCopied)}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiFileCopyLine className="size-3.5 text-text-tertiary" />
            {copied ? t("settings.agentTools.copied") : t("settings.agentTools.copyOfficial")}
          </Button>
        ) : null}
        {tool.docsUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void getIde().agentTools.openDocs({ id: tool.id as AgentToolId })}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiExternalLinkLine className="size-3.5" />
            {t("settings.agentTools.docs")}
          </Button>
        ) : null}
      </div>
    </article>
  )
}

async function runInstall(
  id: string,
  setBusy: (value: boolean) => void,
  setError: (value: string | null) => void,
  onInstalled: () => void
) {
  if (!hasIde()) return
  setBusy(true)
  setError(null)
  try {
    const result = (await getIde().agentTools.install({ id })) as { ok?: boolean; message?: string }
    if (!result?.ok) setError(result?.message || "Install failed.")
    else onInstalled()
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error))
  } finally {
    setBusy(false)
  }
}

function registrySummary(id: string, t: ReturnType<typeof useT>): string {
  const table: Record<string, string> = {
    claude: t("settings.registry.summary.claude"),
    cursor: t("settings.registry.summary.cursor"),
    grok: t("settings.registry.summary.grok"),
    codex: t("settings.registry.summary.codex"),
    antigravity: t("settings.registry.summary.antigravity"),
    gemini: t("settings.registry.summary.gemini"),
    opencode: t("settings.registry.summary.opencode"),
    pi: t("settings.registry.summary.pi"),
    hermes: t("settings.registry.summary.hermes"),
    amp: t("settings.registry.summary.amp"),
    deepseek: t("settings.registry.summary.deepseek"),
    omp: t("settings.registry.summary.omp")
  }
  return table[id] ?? ""
}

function copyText(text: string, setCopied: (value: boolean) => void) {
  void navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  })
}
