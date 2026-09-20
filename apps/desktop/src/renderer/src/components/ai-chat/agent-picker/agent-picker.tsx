/**
 * Composer Agent 选择器：顶部分组导轨 + 下层本地供应商/CLI 面板。
 * 胶囊只写「引擎 · 模型」，协议词不上芯片。
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import { canSwitchAgent, DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { requestEngineSwitch, useEngineHandoffStore } from "./handoff/engine-handoff-store"
import { useCliLoginLoopStore } from "./cli-login-loop"
import { canBindEngine } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { canOpenAgentPicker, sessionHasUserTurns } from "./handoff/plan-composer-switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ModelPickerBody } from "../model-picker/model-picker-body"
import { AgentBrandIcon, isAgentToolId } from "./agent-brand-icon"
import { AgentCliPane } from "./agent-cli-pane"
import { AgentEngineRail } from "./agent-engine-rail"
import { ModelSwitchBadge } from "./model-switch-badge"
import { ModelSwitchToast } from "../composer/model-switch/model-switch-feedback"
import { shouldShowModelSwitchBadge } from "@renderer/lib/session-model"
import { UsagePill } from "../usage/usage-pill"
import { quotaHintText } from "../usage/quota-hint-text"
import { useQuotaHint } from "../usage/use-quota-hint"
import { composerRailSections } from "./composer-agents"
import {
  composerActiveModelLabel,
  composerBoundProviderLabel,
  composerChipParts
} from "./composer-chip-label"
import { EnginePickerRenameRow } from "./engine-picker-rename-row"
import { useEngineFace } from "@renderer/hooks/use-engine-display-name"
import { engineTrueNameTitle } from "@renderer/lib/agent-display-name"

export function AgentPicker({
  modelId,
  modelLabel,
  models,
  onModelChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const open = useChatStore((state) => state.agentPickerOpen)
  const setOpen = useChatStore((state) => state.setAgentPickerOpen)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionModels = useChatStore((state) => state.sessionModels)
  const hasKey = useChatStore((state) => state.hasKey)
  const handoffPhase = useEngineHandoffStore((state) => state.phase)
  const pendingToId = useEngineHandoffStore((state) => state.toRuntimeId)
  const snapshot = useSettingsSnapshot()
  const loginLoops = useCliLoginLoopStore((state) => state.byId)
  const tools = snapshot.data?.agentTools ?? []
  const inspecting = snapshot.isInspectingAccounts
  const { local, cli, soon } = composerRailSections(tools)
  const agents = [...local, ...cli, ...soon]
  const current = agents.find((item) => item.id === runtimeId)
  const [tabId, setTabId] = useState(runtimeId)
  const [toastLabel, setToastLabel] = useState<string | null>(null)
  const tab = agents.find((item) => item.id === tabId) ?? current ?? agents[0]
  const quota = useQuotaHint(runtimeId)
  const messages = useChatStore((state) => state.messages)
  const remembered = current
  const showBadge = shouldShowModelSwitchBadge({
    sessionId,
    sessionModels,
    engineDefault: remembered?.selectedModel ?? null,
    hasUserTurns: sessionHasUserTurns(messages)
  })

  useEffect(() => {
    if (!toastLabel) return
    const timer = window.setTimeout(() => setToastLabel(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toastLabel])

  useEffect(() => {
    if (open) setTabId(runtimeId)
  }, [open, runtimeId])

  useEffect(() => {
    if (handoffPhase === "idle") setTabId(runtimeId)
    if (!canOpenAgentPicker(handoffPhase)) setOpen(false)
  }, [handoffPhase, runtimeId, setOpen])

  useEffect(() => {
    if (!open || !hasIde()) return
    void getIde().models.list().then((res) => {
      if (!Array.isArray(res)) return
      useChatStore.getState().setModels(res as ModelOption[])
    })
    void queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
    void getIde().agentTools.detect().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] })
    })
  }, [open, queryClient])

  const currentAgentName = current?.label ?? (runtimeId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : runtimeId)
  const currentFace = useEngineFace(runtimeId, currentAgentName)
  const pendingTo = agents.find((item) => item.id === pendingToId)
  const pendingToName =
    pendingTo?.label ??
    (pendingToId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : (pendingToId ?? ""))
  const pickerLocked = !canOpenAgentPicker(handoffPhase)
  const activeModelDisplay = composerActiveModelLabel({
    runtimeId,
    catalogLabel: modelLabel,
    catalogId: modelId,
    sessionModelId: sessionId ? sessionModels[sessionId] : undefined,
    agent: current
  })
  const providerLabel =
    runtimeId === DEFAULT_RUNTIME_ID
      ? models.find((item) => item.id === modelId)?.providerName
      : composerBoundProviderLabel(current)
  const chip = pickerLocked
    ? {
        engine: t("chat.handoff.chipPending"),
        model: pendingToName,
        title: t("chat.handoff.chipPendingAria", { to: pendingToName })
      }
    : composerChipParts({
        engineLabel: currentFace.face,
        modelLabel: activeModelDisplay,
        providerLabel
      })
  const chipIconId = pickerLocked && pendingToId ? pendingToId : runtimeId
  const quotaTitle = quotaHintText(quota.percent, quota.reset, (percent) =>
    t("chat.usage.usedPercent", { percent })
  )
  const trueNameTitle = pickerLocked
    ? chip.title
    : engineTrueNameTitle(currentAgentName, t("chat.engineRealName"))
  const chipTitle = [trueNameTitle, quotaTitle].filter(Boolean).join(" · ")

  async function applyAgent(id: string, nextModelId?: string, nextLabel?: string) {
    if (!isAgentToolId(id)) return
    const from = useChatStore.getState().runtimeId
    const result = await requestEngineSwitch(id, nextModelId)
    if (result === "pending" || result === "blocked") {
      setOpen(false)
      return
    }
    if (result === "applied") await queryClient.invalidateQueries({ queryKey: ["settings"] })
    if (nextModelId && id === from && nextLabel) setToastLabel(nextLabel)
  }

  async function onTab(id: string) {
    setTabId(id)
    const agent = agents.find((item) => item.id === id)
    if (!agent || !canSwitchAgent(agent)) return
    if (!canBindEngine(readinessInputOf(agent, { hasKey, loginLoop: loginLoops[agent.id]?.phase }))) {
      return
    }
    await applyAgent(id)
  }

  return (
    <div className="relative shrink-0">
      {toastLabel ? <ModelSwitchToast modelLabel={toastLabel} /> : null}
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (pickerLocked) {
          setOpen(false)
          return
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="composer-engine-chip"
          aria-label={pickerLocked ? chip.title : t("chat.selectAgent")}
          title={chipTitle}
          className={cx(
            "group inline-flex h-6 max-w-[16rem] shrink-0 items-center gap-1 rounded-full border px-2 text-caption-2-medium outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            pickerLocked
              ? "border-accent-500 bg-background-secondary-default text-accent-500"
              : "border-border-button-default bg-accent-500/10 text-text-primary ring-1 ring-accent-500/20 hover:bg-accent-500/15"
          )}
        >
          <span className="flex size-3.5 shrink-0 items-center justify-center">
            <AgentBrandIcon id={chipIconId} size={14} />
          </span>
          <span className="flex min-w-0 items-baseline">
            <span
              className={cx(
                "hidden shrink-0 @[18rem]:inline",
                pickerLocked ? "text-accent-500" : "text-text-secondary"
              )}
            >
              {chip.engine}
            </span>
            {chip.model ? (
              <>
                <span className="mx-1 hidden shrink-0 text-text-secondary @[24rem]:inline">·</span>
                <span
                  className={cx(
                    "hidden min-w-0 truncate font-semibold @[24rem]:inline",
                    pickerLocked ? "text-accent-500" : "text-text-primary"
                  )}
                >
                  {chip.model}
                </span>
              </>
            ) : null}
          </span>
          {pickerLocked ? null : <ModelSwitchBadge visible={showBadge} />}
          {pickerLocked ? null : (
            <RiArrowDownSLine className="size-3 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className={cx(
          "flex w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card",
          tab && tab.id !== DEFAULT_RUNTIME_ID && !canSwitchAgent(tab)
            ? "max-h-[390px]"
            : tab &&
                tab.id !== DEFAULT_RUNTIME_ID &&
                !canBindEngine(readinessInputOf(tab, { hasKey, loginLoop: loginLoops[tab.id]?.phase }))
              ? "max-h-[390px]"
              : "h-[390px]"
        )}
      >
        {pickerLocked || quota.percent == null ? null : (
          <div className="flex items-center justify-between gap-2 border-b border-separator-border px-3 py-1.5">
            <p className="text-caption-2-medium text-text-secondary">{t("chat.usage.accountTitle")}</p>
            <UsagePill runtimeId={runtimeId} />
          </div>
        )}
        <AgentEngineRail
          local={local}
          cli={cli}
          soon={soon}
          selectedId={tab?.id ?? DEFAULT_RUNTIME_ID}
          currentId={runtimeId}
          onSelect={(id) => void onTab(id)}
        />
        {pickerLocked || !tab ? null : (
          <EnginePickerRenameRow runtimeId={tab.id} brandLabel={tab.label} />
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {tab && tab.id !== DEFAULT_RUNTIME_ID ? (
            <AgentCliPane
              agent={tab}
              inspecting={inspecting}
              onUse={(model) => {
                void applyAgent(tab.id, model?.id, model?.label).then(() => setOpen(false))
              }}
              onInstalled={() => {
                void queryClient.invalidateQueries({ queryKey: ["settings"] })
                void queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
              }}
            />
          ) : (
            <ModelPickerBody
              modelId={modelId}
              models={models}
              onSelectModel={(model) => {
                void applyAgent(DEFAULT_RUNTIME_ID, model.id, model.label)
                onModelChange(model)
                setOpen(false)
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  )
}
