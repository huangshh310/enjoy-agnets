/**
 * 引擎选择器状态。视图只负责画，逻辑留在这里并拆开。
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import { canSwitchAgent, DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useEngineFace } from "@renderer/hooks/use-engine-display-name"
import { engineTrueNameTitle } from "@renderer/lib/agent-display-name"
import { useT, type TranslateFn } from "@renderer/i18n"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { quotaHintText, shownQuotaPercent } from "../usage/quota-hint-text"
import { useQuotaHint } from "../usage/use-quota-hint"
import { isAgentToolId } from "./agent-brand-icon"
import { composerRailSections } from "./composer-agents"
import {
  composerActiveModelId,
  composerActiveModelLabel,
  composerBoundProviderLabel,
  composerChipParts
} from "./composer-chip-label"
import { useCliLoginLoopStore } from "./cli-login-loop"
import { canBindEngine } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { requestEngineSwitch, useEngineHandoffStore } from "./handoff/engine-handoff-store"
import { showModelSwitchNotice } from "../composer/model-switch/model-switch-notice"
import { canOpenAgentPicker } from "./handoff/plan-composer-switch"

type RailAgent = ReturnType<typeof composerRailSections>["local"][number]

export function useAgentPicker(modelId: string, modelLabel: string, models: ModelOption[]) {
  const base = useAgentPickerBase()
  useAgentPickerEffects(base)
  const face = useAgentPickerFace(base, modelId, modelLabel, models)
  const actions = useAgentPickerActions(base)
  return { ...base, ...face, ...actions, modelId, modelLabel, models }
}

function useAgentPickerBase() {
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
  const { local, cli, soon } = composerRailSections(snapshot.data?.agentTools ?? [])
  const agents = [...local, ...cli, ...soon]
  const current = agents.find((item) => item.id === runtimeId)
  const [tabId, setTabId] = useState(runtimeId)
  return {
    t, queryClient, open, setOpen, runtimeId, sessionId, sessionModels, hasKey,
    handoffPhase, pendingToId, loginLoops, inspecting: snapshot.isInspectingAccounts,
    local, cli, soon, agents, current, tabId, setTabId,
    tab: agents.find((item) => item.id === tabId) ?? current ?? agents[0]
  }
}

function useAgentPickerEffects(base: ReturnType<typeof useAgentPickerBase>) {
  const { open, runtimeId, handoffPhase, setOpen, setTabId, queryClient } = base
  useEffect(() => {
    if (open) setTabId(runtimeId)
  }, [open, runtimeId, setTabId])
  useEffect(() => {
    if (handoffPhase === "idle") setTabId(runtimeId)
    if (!canOpenAgentPicker(handoffPhase)) setOpen(false)
  }, [handoffPhase, runtimeId, setOpen, setTabId])
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
}

function useAgentPickerFace(
  base: ReturnType<typeof useAgentPickerBase>,
  modelId: string,
  modelLabel: string,
  models: ModelOption[]
) {
  const { t, runtimeId, sessionId, sessionModels, current, agents, pendingToId, handoffPhase } = base
  const pickerLocked = !canOpenAgentPicker(handoffPhase)
  const currentAgentName = current?.label ?? (runtimeId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : runtimeId)
  const currentFace = useEngineFace(runtimeId, currentAgentName)
  const pendingTo = agents.find((item) => item.id === pendingToId)
  const pendingToName =
    pendingTo?.label ?? (pendingToId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : (pendingToId ?? ""))
  const quota = useQuotaHint(runtimeId)
  const modelFace = pickerModelFace({
    t, runtimeId, sessionId, sessionModels, current, modelId, modelLabel, models,
    pickerLocked, pendingToName, engineFace: currentFace.face
  })
  return {
    pickerLocked,
    ...modelFace,
    chipIconId: pickerLocked && pendingToId ? pendingToId : runtimeId,
    chipTitle: [
      pickerLocked ? modelFace.chip.title : engineTrueNameTitle(currentAgentName, t("chat.engineRealName")),
      quotaHintText(
        quota.percent == null ? null : shownQuotaPercent(quota.percent, quota.usageNumber),
        quota.reset,
        (percent) =>
          t(
            quota.usageNumber === "remaining" ? "chat.usage.remainingPercent" : "chat.usage.usedPercent",
            { percent }
          )
      )
    ].filter(Boolean).join(" · "),
    quota
  }
}

function pickerModelFace(input: {
  t: TranslateFn
  runtimeId: string
  sessionId: string | null
  sessionModels: Record<string, string>
  current: ReturnType<typeof useAgentPickerBase>["current"]
  modelId: string
  modelLabel: string
  models: ModelOption[]
  pickerLocked: boolean
  pendingToName: string
  engineFace: string
}) {
  const sessionModelId = input.sessionId ? input.sessionModels[input.sessionId] : undefined
  const face = {
    runtimeId: input.runtimeId,
    catalogLabel: input.modelLabel,
    catalogId: input.modelId,
    sessionModelId,
    agent: input.current
  }
  const providerLabel = input.runtimeId === DEFAULT_RUNTIME_ID
    ? input.models.find((item) => item.id === input.modelId)?.providerName
    : composerBoundProviderLabel(input.current)
  const chip = input.pickerLocked
    ? {
        engine: input.t("chat.handoff.chipPending"),
        model: input.pendingToName,
        title: input.t("chat.handoff.chipPendingAria", { to: input.pendingToName })
      }
    : composerChipParts({
        engineLabel: input.engineFace,
        modelLabel: composerActiveModelLabel(face),
        providerLabel
      })
  return {
    activeModelId: composerActiveModelId(face),
    chip
  }
}

function useAgentPickerActions(base: ReturnType<typeof useAgentPickerBase>) {
  const { queryClient, setOpen, agents, hasKey, loginLoops, setTabId } = base
  async function applyAgent(id: string, nextModelId?: string, nextLabel?: string) {
    if (!isAgentToolId(id)) return
    const from = useChatStore.getState().runtimeId
    const result = await requestEngineSwitch(id, nextModelId)
    if (result === "pending" || result === "blocked") {
      setOpen(false)
      return
    }
    if (result === "applied") await queryClient.invalidateQueries({ queryKey: ["settings"] })
    if (result === "applied" && nextModelId && id === from && nextLabel) showModelSwitchNotice(nextLabel)
  }
  async function onTab(id: string) {
    setTabId(id)
    const agent = agents.find((item) => item.id === id)
    if (!agent || !canSwitchAgent(agent)) return
    const loop = loginLoops[agent.id]?.phase
    if (!canBindEngine(readinessInputOf(agent, { hasKey, loginLoop: loop }))) return
    await applyAgent(id)
  }
  return { applyAgent, onTab }
}

export type AgentPickerModel = ReturnType<typeof useAgentPicker> & { onModelChange: (model: ModelOption) => void }
export type { RailAgent }
