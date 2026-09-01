/**
 * 实验媒体确认：选视频模型或发送时弹 ConfirmDialog，不要写会话 error 条。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { isVideoOnlyModelId } from "@enjoy-agents/providers/capabilities"
import { patchPreferences, useSettingsSnapshot } from "./use-settings-snapshot"
import { videoRunNeedsExperimental } from "./experimental-media-policy"
import type { ModelOption } from "@renderer/stores/chat-store"

type Pending = { kind: "send" } | { kind: "pick"; model: ModelOption }

export function useExperimentalMediaGate(input: {
  modelId: string
  models: ModelOption[]
  onSend: () => void
  onModelChange: (model: ModelOption) => void
}) {
  const experimentalMedia = useSettingsSnapshot().data?.preferences.experimentalMedia ?? false
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<Pending | null>(null)

  function needsGate(modelId: string) {
    const caps = input.models.find((model) => model.id === modelId)?.capabilities
    return videoRunNeedsExperimental(modelId, caps, experimentalMedia)
  }

  function requestSend() {
    if (needsGate(input.modelId)) setPending({ kind: "send" })
    else input.onSend()
  }

  function requestModel(model: ModelOption) {
    if (isVideoOnlyModelId(model.id) && !experimentalMedia) {
      setPending({ kind: "pick", model })
      return
    }
    input.onModelChange(model)
  }

  async function confirm() {
    await patchPreferences({ experimentalMedia: true })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
    const next = pending
    setPending(null)
    if (next?.kind === "send") input.onSend()
    if (next?.kind === "pick") input.onModelChange(next.model)
  }

  return {
    promptOpen: Boolean(pending),
    requestSend,
    requestModel,
    confirm,
    cancel: () => setPending(null)
  }
}
