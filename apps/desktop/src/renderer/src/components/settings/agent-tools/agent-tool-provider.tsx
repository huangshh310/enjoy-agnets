/**
 * Claude / Codex 动力源：绑定供应商，可选同步到本机配置。
 */
import { RiPlugLine, RiRestartLine, RiUploadCloud2Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolProvider({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  if (!actions.supportsCustomInjection) return null
  if (tool.status !== "ready" && !actions.isDefaultLocal) return null
  return (
    <div className="mt-1 flex flex-col gap-2.5 rounded-xl border border-accent-500/20 bg-accent-500/5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RiPlugLine className="size-4 text-accent-500" />
          <span className="text-body-medium font-semibold text-text-primary">
            {t("settings.agentTools.providerMode")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption-2-medium text-text-tertiary">
            {tool.useCustomProvider
              ? t("settings.agentTools.customEndpoint")
              : t("settings.agentTools.officialLogin")}
          </span>
          <Switch
            checked={tool.useCustomProvider}
            onCheckedChange={(checked) => void actions.persist({ useCustomProvider: checked })}
            aria-label={t("settings.agentTools.providerMode")}
          />
        </div>
      </div>
      {tool.useCustomProvider ? (
        <ProviderBindRow tool={tool} actions={actions} />
      ) : (
        <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.providerHint")}</p>
      )}
    </div>
  )
}

function ProviderBindRow({ tool, actions }: { tool: AgentToolPublic; actions: AgentToolActions }) {
  const t = useT()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-accent-500/15 pt-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.bindProvider")}:</span>
        <select
          value={tool.providerId ?? actions.compatibleProviders[0]?.id ?? ""}
          onChange={(event) => void actions.persist({ providerId: event.target.value })}
          className="max-w-[220px] truncate rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-1-medium text-text-primary shadow-2xs outline-none hover:border-border-button-hover focus:ring-1 focus:ring-accent-500"
        >
          {actions.compatibleProviders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.baseURL || "—"})
            </option>
          ))}
          {actions.compatibleProviders.length === 0 ? (
            <option value="">{t("settings.agentTools.noCompatibleProvider")}</option>
          ) : null}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actions.syncingConfig}
          onClick={() => void actions.syncToCli()}
          className="gap-1.5 text-caption-1-medium hover:border-accent-500/50"
        >
          <RiUploadCloud2Line className={`size-3.5 ${actions.syncingConfig ? "animate-spin text-accent-500" : ""}`} />
          {actions.syncingConfig ? t("settings.agentTools.syncing") : t("settings.agentTools.syncToHome")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={actions.restoringConfig}
          onClick={() => void actions.restoreCli()}
          className="gap-1 text-caption-2-medium text-text-tertiary hover:text-text-primary"
        >
          <RiRestartLine className="size-3" />
          {t("settings.agentTools.restoreOfficial")}
        </Button>
      </div>
    </div>
  )
}
