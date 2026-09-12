/**
 * Composer 顶部分段：探索 | 执行。内部仍写 ask/plan vs agent。
 */
import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import {
  applyComposerSurface,
  surfaceForMode,
  type ComposerSurface
} from "../composer-mode"

export function ExploreExecuteToggle() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const runtimeId = useChatStore((state) => state.runtimeId)
  if (!composerChromeFor(runtimeId).executionModes) return null
  const surface = surfaceForMode(mode)

  function pick(next: ComposerSurface) {
    useChatStore.getState().setMode(applyComposerSurface(mode, next))
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3.5 pb-1">
      <div
        role="radiogroup"
        aria-label={t("chat.surfaceSelect")}
        className="inline-flex rounded-full bg-background-tertiary-default p-0.5 ring-1 ring-border-button-default"
      >
        <SurfaceButton
          active={surface === "explore"}
          variant="explore"
          label={t("chat.surfaceExplore")}
          onClick={() => pick("explore")}
        />
        <SurfaceButton
          active={surface === "execute"}
          variant="execute"
          label={t("chat.surfaceExecute")}
          onClick={() => pick("execute")}
        />
      </div>
    </div>
  )
}

function SurfaceButton({
  active,
  variant,
  label,
  onClick
}: {
  active: boolean
  variant: ComposerSurface
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-testid={`composer-surface-${variant}`}
      onClick={onClick}
      className={cx(
        "h-7 cursor-pointer rounded-full px-3 text-caption-1-semibold transition-colors",
        active && variant === "explore" && "bg-accent-500/10 text-accent-600",
        active && variant === "execute" && "bg-accent-500 text-text-white",
        !active && "text-text-tertiary hover:text-text-secondary"
      )}
    >
      {label}
    </button>
  )
}
