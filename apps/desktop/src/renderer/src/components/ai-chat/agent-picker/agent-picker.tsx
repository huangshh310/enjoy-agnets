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
import { canBindEngine, isEngineLit } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { canOpenAgentPicker } from "./handoff/plan-composer-switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ModelPickerBody } from "../model-picker/model-picker-body"
import { AgentBrandIcon, isAgentToolId } from "./agent-brand-icon"
import { AgentCliPane } from "./agent-cli-pane"
import { AgentEngineRail } from "./agent-engine-rail"
import { UsagePill } from "../usage/usage-pill"
import { cliModelLabel, composerRailSections } from "./composer-agents"
import { composerChipParts } from "./composer-chip-label"

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
  const hasKey = useChatStore((state) => state.hasKey)
  const handoffPhase = useEngineHandoffStore((state) => state.phase)
  const pendingToId = useEngineHandoffStore((state) => state.toRuntimeId)
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  const inspecting = snapshot.isInspectingAccounts
  const { local, cli, soon } = composerRailSections(tools)
  const agents = [...local, ...cli, ...soon]
  const current = agents.find((item) => item.id === runtimeId)
  const [tabId, setTabId] = useState(runtimeId)
  const tab = agents.find((item) => item.id === tabId) ?? current ?? agents[0]

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
  const pendingTo = agents.find((item) => item.id === pendingToId)
  const pendingToName =
    pendingTo?.label ??
    (pendingToId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : (pendingToId ?? ""))
  const pickerLocked = !canOpenAgentPicker(handoffPhase)
  const activeModelDisplay = runtimeId === DEFAULT_RUNTIME_ID ? (modelLabel || modelId) : cliModelLabel(current)
  const providerLabel =
    runtimeId === DEFAULT_RUNTIME_ID
      ? models.find((item) => item.id === modelId)?.providerName
      : undefined
  const chip = pickerLocked
    ? {
        engine: t("chat.handoff.chipPending"),
        model: pendingToName,
        title: t("chat.handoff.chipPendingAria", { to: pendingToName })
      }
    : composerChipParts({
        engineLabel: currentAgentName,
        modelLabel: activeModelDisplay,
        providerLabel
      })
  const chipIconId = pickerLocked && pendingToId ? pendingToId : runtimeId

  async function applyAgent(id: string, nextModelId?: string) {
    if (!isAgentToolId(id)) return
    const result = await requestEngineSwitch(id, nextModelId)
    if (result === "pending" || result === "blocked") {
      setOpen(false)
      return
    }
    if (result === "applied") await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  async function onTab(id: string) {
    setTabId(id)
    const agent = agents.find((item) => item.id === id)
    if (!agent || !canSwitchAgent(agent)) return
    if (!canBindEngine(readinessInputOf(agent, { hasKey }))) return
    await applyAgent(id)
  }

  return (
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
          aria-label={pickerLocked ? chip.title : t("chat.selectAgent")}
          title={chip.title}
          className={cx(
            "group inline-flex h-8 max-w-[18rem] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-caption-1-medium shadow-2xs outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            pickerLocked
              ? "border-accent-500 bg-background-secondary-default text-accent-500"
              : "border-border-button-default bg-background-primary-default text-text-primary hover:border-border-button-hover hover:bg-background-secondary-hover"
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            <AgentBrandIcon id={chipIconId} size={14} />
          </span>
          <span className="flex min-w-0 items-baseline">
            <span className={cx("shrink-0", pickerLocked ? "text-accent-500" : "text-text-secondary")}>
              {chip.engine}
            </span>
            {chip.model ? (
              <>
                <span className="mx-1 shrink-0 text-text-tertiary">·</span>
                <span
                  className={cx(
                    "min-w-0 truncate font-semibold",
                    pickerLocked ? "text-accent-500" : "text-text-primary"
                  )}
                >
                  {chip.model}
                </span>
              </>
            ) : null}
          </span>
          {pickerLocked ? null : <UsagePill runtimeId={runtimeId} />}
          {pickerLocked ? null : (
            <span
              className={`size-1.5 shrink-0 rounded-full shadow-2xs ${
                current && isEngineLit(readinessInputOf(current, { hasKey }))
                  ? "bg-accent-500"
                  : "bg-text-tertiary"
              }`}
            />
          )}
          {pickerLocked ? null : (
            <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
            : tab && tab.id !== DEFAULT_RUNTIME_ID && !canBindEngine(readinessInputOf(tab, { hasKey }))
              ? "max-h-[390px]"
              : "h-[390px]"
        )}
      >
        <AgentEngineRail
          local={local}
          cli={cli}
          soon={soon}
          selectedId={tab?.id ?? DEFAULT_RUNTIME_ID}
          currentId={runtimeId}
          onSelect={(id) => void onTab(id)}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {tab && tab.id !== DEFAULT_RUNTIME_ID ? (
            <AgentCliPane
              agent={tab}
              inspecting={inspecting}
              onUse={(model) => {
                void applyAgent(tab.id, model?.id).then(() => setOpen(false))
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
                void applyAgent(DEFAULT_RUNTIME_ID)
                onModelChange(model)
                setOpen(false)
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
