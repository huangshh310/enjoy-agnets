/**
 * 思考铬：贴在单一引擎芯片旁的小档。不单独占一整行宽条。
 */
import { RiBrainLine } from "@remixicon/react"
import { composerThinkingChrome } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { cx } from "@/utils/cx"
import { ReasoningEffortToggle } from "../../reasoning-effort-toggle"
import { useComposerModelSwitch } from "../model-switch/use-composer-model-switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function ComposerThinkingChrome({
  modelId,
  modelLabel,
  models,
  compact = false
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  compact?: boolean
}) {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const kind = composerThinkingChrome(runtimeId)
  const switched = useComposerModelSwitch({ modelId, modelLabel, models })
  if (kind === "none") return null
  if (kind === "effort") return <ReasoningEffortToggle compact={compact} />
  const current = switched.chip.model || switched.engineLabel
  return (
    <button
      type="button"
      data-testid="composer-thinking-follow-model"
      title={t("chat.thinkingFollowModelHint", { model: current })}
      onClick={() => useChatStore.getState().setAgentPickerOpen(true)}
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full text-caption-2-medium",
        "bg-background-tertiary-default/90 text-text-secondary ring-1 ring-border-button-default/80",
        "outline-none hover:bg-background-tertiary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        compact ? "h-6 px-2" : "h-6 px-2"
      )}
    >
      <RiBrainLine className="size-3 shrink-0 text-text-tertiary" aria-hidden />
      <span className="whitespace-nowrap">{t("chat.thinkingFollowModelShort")}</span>
    </button>
  )
}
