/**
 * Composer 思考铬：effort 五档；model-id 只写「思考 · 跟模型」；none 不画。
 */
import { RiBrainLine } from "@remixicon/react"
import { composerThinkingChrome } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { ReasoningEffortToggle } from "../../reasoning-effort-toggle"
import { useComposerModelSwitch } from "../model-switch/use-composer-model-switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function ComposerThinkingChrome({
  modelId,
  modelLabel,
  models,
  onOpenModels
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  /** model-id 入口打开本引擎 I1 名单，不假五档。 */
  onOpenModels?: () => void
}) {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const kind = composerThinkingChrome(runtimeId)
  const switched = useComposerModelSwitch({ modelId, modelLabel, models })
  if (kind === "none") return null
  if (kind === "effort") return <ReasoningEffortToggle />
  const current = switched.chip.model || switched.engineLabel
  return (
    <button
      type="button"
      data-testid="composer-thinking-follow-model"
      title={t("chat.thinkingFollowModelHint", { model: current })}
      onClick={onOpenModels}
      className={cx(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-caption-2-medium",
        "bg-background-tertiary-default/90 text-text-secondary ring-1 ring-border-button-default/80",
        "outline-none hover:bg-background-tertiary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      )}
    >
      <RiBrainLine className="size-3 shrink-0 text-text-tertiary" aria-hidden />
      <span className="whitespace-nowrap">{t("chat.thinkingFollowModel")}</span>
    </button>
  )
}
