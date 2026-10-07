/**
 * 选中供应商后：带族标的模型行、套到其他兼容 CLI、可选同步本机。
 * 模型是单独字段，不跟账号行拼成「档案 · 模型」。
 */
import { RiCheckLine, RiRestartLine, RiUploadCloud2Line } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import {
  alsoUseTargets,
  providerBindCanSyncHome,
  type AgentToolId,
  type AgentToolPublic,
  type ProviderPublic
} from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { ModelBrandIcon, ProviderIcon } from "../providers/provider-icons"
import { adviseCatalogUrl, isApiStyle } from "@enjoy-agents/providers/presets"
import { cliModelFamilyKey } from "@renderer/components/ai-chat/agent-picker/cli-model-icon"
import {
  BIND_TRIGGER_CLASS,
  BindField,
  BindMenuFace,
  BindTriggerFace
} from "./bind-source/bind-field"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolBoundExtras({
  tool,
  actions,
  profile
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  profile: ProviderPublic
}) {
  const t = useT()
  const models = (profile.models ?? []).filter((model) => model.enabled !== false)
  const modelId = tool.selectedModel || profile.modelId || models[0]?.id || ""
  const showCodexHint = tool.id === "codex" && profile.apiStyle === "openai"
  return (
    <div className="flex flex-col gap-3">
      <ModelPicker modelId={modelId} models={models} profile={profile} actions={actions} />
      <BindHostHint profile={profile} />
      {showCodexHint ? (
        <p className="text-caption-2-regular text-status-yellow-text">{t("settings.agentTools.codexChatWireHint")}</p>
      ) : null}
      <ApplyToOthers tool={tool} profile={profile} modelId={modelId} />
      {providerBindCanSyncHome(tool.id) ? <SyncFold actions={actions} /> : null}
    </div>
  )
}

function ModelPicker({
  modelId,
  models,
  profile,
  actions
}: {
  modelId: string
  models: Array<{ id: string; label?: string }>
  profile: ProviderPublic
  actions: AgentToolActions
}) {
  const t = useT()
  if (models.length === 0) {
    return (
      <BindField label={t("settings.agentTools.bindModelLabel")}>
        <input
          defaultValue={modelId}
          onBlur={(event) => {
            const next = event.target.value.trim()
            if (next) void actions.persist({ modelId: next })
          }}
          placeholder={t("settings.agentTools.bindModelHint")}
          aria-label={t("settings.agentTools.bindModelLabel")}
          className="h-11 w-full rounded-2xl border border-border-button-default bg-background-primary-default px-3 font-mono text-caption-1-medium outline-none focus:ring-1 focus:ring-accent-500"
        />
      </BindField>
    )
  }
  const current = models.find((item) => item.id === modelId)
  const title = current?.label || current?.id || modelId
  return (
    <BindField label={t("settings.agentTools.bindModelLabel")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("settings.agentTools.bindModelLabel")}
            className={BIND_TRIGGER_CLASS}
          >
            <BindTriggerFace
              leading={<BindModelMark model={current ?? { id: modelId, label: modelId }} profile={profile} size={22} />}
              title={title}
              subtitle={t("settings.agentTools.bindModelSub")}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={`${SETTINGS_DRAWER_Z_CLASS.float} max-h-80 min-w-72 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
        >
          {models.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => void actions.persist({ modelId: item.id })}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2"
            >
              <BindMenuFace
                leading={<BindModelMark model={item} profile={profile} size={18} />}
                title={item.label || item.id}
                subtitle={item.label && item.label !== item.id ? item.id : undefined}
              />
              {item.id === modelId ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BindField>
  )
}

function BindHostHint({ profile }: { profile: ProviderPublic }) {
  const t = useT()
  const style = isApiStyle(profile.apiStyle) ? profile.apiStyle : "openai"
  const advice = adviseCatalogUrl(profile.baseURL, style)
  if (advice.action !== "reject") return null
  return (
    <p className="text-pretty text-caption-2-medium text-text-error-primary">
      {t(`settings.providers.${advice.code}`, advice.vars)}
    </p>
  )
}

function BindModelMark({
  model,
  profile,
  size = 15
}: {
  model: { id: string; label?: string }
  profile: ProviderPublic
  size?: number
}) {
  if (cliModelFamilyKey(model.id, model.label ?? "")) {
    return (
      <ModelBrandIcon
        modelId={`${model.id} ${model.label ?? ""}`.trim()}
        providerKind={profile.kind}
        size={size}
      />
    )
  }
  return <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={size} />
}

function ApplyToOthers({
  tool,
  profile,
  modelId
}: {
  tool: AgentToolPublic
  profile: ProviderPublic
  modelId: string
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const others = alsoUseTargets(tool.id, profile, tools)
  if (others.length === 0) return null

  async function toggle(target: AgentToolPublic) {
    if (!hasIde()) return
    const using = target.useCustomProvider && target.providerId === profile.id
    await getIde().agentTools.upsert({
      id: target.id as AgentToolId,
      useCustomProvider: !using,
      providerId: using ? undefined : profile.id,
      modelId: using ? undefined : modelId
    })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption-2-medium text-text-secondary">{t("settings.agentTools.alsoUseOn")}</p>
      <div className="flex flex-wrap gap-1.5">
        {others.map((item) => {
          const on = item.useCustomProvider && item.providerId === profile.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void toggle(item)}
              className={
                on
                  ? "rounded-full bg-accent-500/10 px-2.5 py-1 text-caption-2-medium text-accent-600"
                  : "rounded-full border border-border-button-default px-2.5 py-1 text-caption-2-medium text-text-tertiary transition-colors hover:border-border-button-hover hover:text-text-primary"
              }
            >
              {shortAgentLabel(item.id, item.label)}
              {on ? " ✓" : ""}
            </button>
          )
        })}
      </div>
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.alsoUseNoSandbox")}</p>
    </div>
  )
}

function shortAgentLabel(id: string, label: string): string {
  if (id === "claude") return "Claude"
  if (id === "codex") return "Codex"
  if (id === "gemini") return "Gemini"
  if (id === "opencode") return "OpenCode"
  if (id === "deepseek") return "DeepSeek"
  return label.replace(/\s+CLI$/i, "").split(/\s+/)[0] || label
}

function SyncFold({ actions }: { actions: AgentToolActions }) {
  const t = useT()
  return (
    <details>
      <summary className="cursor-pointer text-caption-2-medium text-text-secondary transition-colors hover:text-text-primary">
        {t("settings.agentTools.syncToggle")}
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border-button-default/80 bg-background-primary-default px-3 py-2.5">
        <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.syncHint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actions.syncingConfig}
            onClick={() => void actions.syncToCli()}
            className="gap-1.5 text-caption-1-medium"
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
    </details>
  )
}
