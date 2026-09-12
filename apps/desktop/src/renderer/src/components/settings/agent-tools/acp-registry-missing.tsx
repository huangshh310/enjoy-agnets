/**
 * Registry 未找到卡：还没装好。有配方一键+复制，否则复制是主行动。禁假一键、假已连接。
 */
import { RiFileCopyLine } from "@remixicon/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { formatInstallFailLine } from "./install-row-copy"
import { copyRegistryCommand, runRegistryInstall } from "./acp-registry-actions"
import { registryCommandFor, registryInstallAction } from "./acp-registry-model"
import type { RegistryRow } from "./acp-registry.types"

export function AcpRegistryMissing({
  row,
  onInstalled
}: {
  row: RegistryRow
  onInstalled: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const action = registryInstallAction(row.tool, row.status)
  const command = registryCommandFor(row.tool, row.status)
  const failLine = error ? formatInstallFailLine(error, t) : null
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{row.tool.label}</h3>
        <p className="mt-1 text-caption-1-medium text-text-primary">{t("settings.registry.notReadyTitle")}</p>
        <p className="mt-1 text-caption-1-regular text-text-secondary">{t("settings.registry.notReadyHint")}</p>
      </div>
      {command ? (
        <p className="rounded-lg bg-background-secondary-default/60 px-3 py-2 font-mono text-caption-2-medium text-text-secondary">
          {command}
        </p>
      ) : null}
      {failLine ? <p className="text-caption-1-medium text-text-error-primary">{failLine}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {action === "install" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void runRegistryInstall(row.tool.id, setBusy, setError, onInstalled)}
            className="text-caption-1-medium"
          >
            {busy ? t("settings.agentTools.installing") : t("settings.agentTools.install")}
          </Button>
        ) : null}
        {command ? (
          <Button
            type="button"
            size="sm"
            variant={action === "copy" ? "default" : "outline"}
            onClick={() => copyRegistryCommand(command, setCopied)}
            className="gap-1.5 text-caption-1-medium"
          >
            {action === "install" ? <RiFileCopyLine className="size-3.5 text-text-tertiary" /> : null}
            {copied ? t("settings.agentTools.copied") : t("settings.registry.copyCommand")}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
