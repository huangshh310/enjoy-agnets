/**
 * Composer 输入框下的 I1 脚注，和顶栏芯片共用同一套态。
 */
import type { ModelOption } from "@renderer/stores/chat-store"
import { ModelSwitchFootnote } from "./model-switch-feedback"
import { useComposerModelSwitch } from "./use-composer-model-switch"

export function ModelSwitchFootnoteSlot({
  modelId,
  modelLabel,
  models
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
}) {
  const state = useComposerModelSwitch({ modelId, modelLabel, models })
  return <ModelSwitchFootnote kind={state.kind} sessionId={state.sessionId} switched={state.showBadge} />
}
