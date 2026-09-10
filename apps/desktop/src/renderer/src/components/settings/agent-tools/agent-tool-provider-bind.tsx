/**
 * 选中供应商后：带族标的模型下拉、套到其他兼容 CLI、可选同步本机。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiCheckLine, RiRestartLine, RiUploadCloud2Line } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import {
  providerBindCanSyncHome,
  providersCompatibleWith,
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
  const models = profile.models ?? []
  const modelId = tool.selectedModel || profile.modelId || models[0]?.id || ""
  const showCodexHint = tool.id === "codex" && profile.apiStyle === "openai"
  return (
    <div className="flex flex-col gap-2.5">
      <ModelPicker modelId={modelId} models={models} profile={profile} actions={actions} />
      <BindHostHint profile={profile} />
      {showCodexHint ? (
        <p className="text-caption-2-regular text-state-warning-text">{t("settings.agentTools.codexChatWireHint")}</p>
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
      <input
        defaultValue={modelId}
        onBlur={(event) => {
          const next = event.target.value.trim()
          if (next) void actions.persist({ modelId: next })
        }}
        placeholder={t("settings.agentTools.bindModelHint")}
        className="h-9 w-full rounded-xl border border-border-button-default bg-background-primary-default px-2.5 font-mono text-caption-2-medium outline-none focus:ring-1 focus:ring-accent-500"
      />
    )
  }
  const current = models.find((item) => item.id === modelId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("settings.agentTools.bindModel")}
          className="flex h-9 w-full items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-2.5 text-left shadow-2xs outline-none hover:border-border-button-hover focus:ring-1 focus:ring-accent-500"
        >
          <BindModelMark model={current ?? { id: modelId, label: modelId }} profile={profile} />
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
            {current?.label || current?.id || modelId}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`${SETTINGS_DRAWER_Z_CLASS.float} max-h-80 w-72 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {models.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => void actions.persist({ modelId: item.id })}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5"
          >
            <BindModelMark model={item} profile={profile} />
            <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
              {item.label || item.id}
            </span>
            {item.id === modelId ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  profile
}: {
  model: { id: string; label?: string }
  profile: ProviderPublic
}) {
  if (cliModelFamilyKey(model.id, model.label ?? "")) {
    return (
      <ModelBrandIcon
        modelId={`${model.id} ${model.label ?? ""}`.trim()}
        providerKind={profile.kind}
        size={15}
      />
    )
  }
  return <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={15} />
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
  const others = tools.filter(
    (item) =>
      item.id !== tool.id &&
      item.status === "ready" &&
      providersCompatibleWith(item.id, profile)
  )
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
      <p className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.alsoUseOn")}</p>
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
                  ? "rounded-lg border border-accent-500/40 bg-accent-500/10 px-2 py-1 text-caption-2-medium text-text-primary"
                  : "rounded-lg border border-border-button-default px-2 py-1 text-caption-2-medium text-text-secondary hover:border-border-button-hover"
              }
            >
              {shortAgentLabel(item.id, item.label)}
            </button>
          )
        })}
      </div>
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
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-caption-2-medium text-text-tertiary hover:text-text-secondary"
      >
        {t("settings.agentTools.syncToggle")}
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-2">
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
      ) : null}
    </div>
  )
}
