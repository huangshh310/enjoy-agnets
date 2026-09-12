/**
 * Registry 详情：未找到走空卡；已装才展示说明与启动预览。无假「已连接」。
 */
import { RiExternalLinkLine, RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useState } from "react"
import { asAgentToolId, copyRegistryCommand } from "./acp-registry-actions"
import { AcpRegistryMissing } from "./acp-registry-missing"
import { isRegistryNotReady, registryCommandFor } from "./acp-registry-model"
import type { RegistryRow } from "./acp-registry.types"

export function AcpRegistryDetail({
  row,
  onInstalled
}: {
  row: RegistryRow | undefined
  onInstalled: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  if (!row) {
    return (
      <div className="rounded-xl border border-dashed border-border-button-default px-4 py-8 text-caption-1-regular text-text-tertiary">
        {t("settings.registry.emptyDetail")}
      </div>
    )
  }
  if (isRegistryNotReady(row.status)) {
    return <AcpRegistryMissing row={row} onInstalled={onInstalled} />
  }
  const { tool } = row
  const summary = registrySummary(tool.id, t) || tool.needsLoginHint
  const commandPreview = registryCommandFor(tool, row.status)
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-button-default bg-background-primary-default p-4">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{tool.label}</h3>
        <p className="mt-1 text-caption-1-regular text-text-secondary">{summary}</p>
      </div>
      <p className="rounded-lg bg-background-secondary-default/60 px-3 py-2 font-mono text-caption-2-medium text-text-secondary">
        {commandPreview || "—"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {tool.installCommand ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copyRegistryCommand(tool.installCommand, setCopied)}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiFileCopyLine className="size-3.5 text-text-tertiary" />
            {copied ? t("settings.agentTools.copied") : t("settings.registry.copyCommand")}
          </Button>
        ) : null}
        {tool.docsUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void getIde().agentTools.openDocs({ id: asAgentToolId(tool.id) })}
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
