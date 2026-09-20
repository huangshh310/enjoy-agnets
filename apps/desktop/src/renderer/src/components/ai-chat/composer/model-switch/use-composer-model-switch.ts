/**
 * Composer I1 换模态：能力表 + 本引擎名单 + 会话覆盖。
 */
import { useMemo } from "react"
import { capabilitiesFor } from "@enjoy-agents/ipc-contract"
import { useCliLoginLoopStore } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { engineReadiness } from "@renderer/components/ai-chat/agent-picker/engine-readiness"
import { readinessInputOf } from "@renderer/components/ai-chat/agent-picker/engine-readiness-input"
import { composerActiveModelLabel, composerChipParts } from "@renderer/components/ai-chat/agent-picker/composer-chip-label"
import { sessionHasUserTurns } from "@renderer/components/ai-chat/agent-picker/handoff/plan-composer-switch"
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { modelSwitchKind } from "@renderer/lib/model-switch-state"
import { getEffectiveModel, shouldShowModelSwitchBadge } from "@renderer/lib/session-model"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import type { SwitchableModel } from "./model-switch-panel"

export function useComposerModelSwitch(input: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
}) {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionModels = useChatStore((state) => state.sessionModels)
  const messages = useChatStore((state) => state.messages)
  const hasKey = useChatStore((state) => state.hasKey)
  const loginLoops = useCliLoginLoopStore((state) => state.byId)
  const snapshot = useSettingsSnapshot()
  const agent =
    snapshot.data?.agentTools?.find((tool) => tool.id === runtimeId) ?? rememberedAgentTool(runtimeId)
  const readiness = resolveChipReadiness(runtimeId, agent, hasKey, loginLoops[agent?.id ?? ""]?.phase)
  const engineModels = useMemo(
    () => engineModelsForChip(runtimeId, input.models, agent?.models ?? []),
    [runtimeId, input.models, agent?.models]
  )
  const kind = modelSwitchKind({
    modelsCapability: capabilitiesFor(runtimeId).models,
    readiness,
    modelCount: engineModels.length
  })
  const effectiveId =
    getEffectiveModel({
      sessionId,
      sessionModels,
      engineDefault: input.modelId || agent?.selectedModel,
      catalogFirst: engineModels[0]?.id
    }) ?? input.modelId
  const activeLabel = composerActiveModelLabel({
    runtimeId,
    catalogLabel: input.modelLabel,
    catalogId: input.modelId,
    sessionModelId: sessionId ? sessionModels[sessionId] : undefined,
    agent
  })
  const engineLabel = agent?.label ?? (runtimeId === DEFAULT_RUNTIME_ID ? t("chat.usage.enjoyLocal") : runtimeId)
  return {
    kind,
    runtimeId,
    sessionId,
    engineLabel,
    engineModels,
    effectiveId,
    chip: composerChipParts({ engineLabel, modelLabel: activeLabel }),
    showBadge: shouldShowModelSwitchBadge({
      sessionId,
      sessionModels,
      engineDefault: agent?.selectedModel ?? null,
      hasUserTurns: sessionHasUserTurns(messages)
    }),
    unsupported: kind === "unsupported"
  }
}

function resolveChipReadiness(
  runtimeId: string,
  agent: ReturnType<typeof rememberedAgentTool>,
  hasKey: boolean,
  loginLoop: "idle" | "authorizing" | "failed" | undefined
) {
  if (agent) return engineReadiness(readinessInputOf(agent, { hasKey, loginLoop }))
  if (runtimeId === DEFAULT_RUNTIME_ID) return hasKey === false ? "needs_key" : "ready"
  return "inspecting" as const
}

function engineModelsForChip(
  runtimeId: string,
  catalog: ModelOption[],
  advertised: ReadonlyArray<{ id: string; label: string }>
): SwitchableModel[] {
  if (runtimeId === DEFAULT_RUNTIME_ID) {
    return catalog.map((item) => ({ id: item.id, label: item.label || item.id }))
  }
  return advertised.map((item) => ({ id: item.id, label: item.label || item.id }))
}
