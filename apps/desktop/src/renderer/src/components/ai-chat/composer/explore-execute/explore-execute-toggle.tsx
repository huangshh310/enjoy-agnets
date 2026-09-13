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

export function ExploreExecuteToggle({ className }: { className?: string } = {}) {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const runtimeId = useChatStore((state) => state.runtimeId)
  if (!composerChromeFor(runtimeId).executionModes) return null
  const surface = surfaceForMode(mode)

  function pick(next: ComposerSurface) {
    useChatStore.getState().setMode(applyComposerSurface(mode, next))
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("chat.surfaceSelect")}
      className={cx(
        "inline-flex items-center rounded-full bg-background-tertiary-default/90 p-0.5 ring-1 ring-border-button-default/80",
        className
      )}
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
        "h-6 cursor-pointer rounded-full px-2.5 text-caption-2-medium transition-all duration-150 select-none",
        active && variant === "explore" && "bg-accent-500/15 font-medium text-accent-600 dark:text-accent-400 shadow-2xs",
        active && variant === "execute" && "bg-accent-500 font-medium text-text-white shadow-2xs",
        !active && "text-text-tertiary hover:text-text-secondary"
      )}
    >
      {label}
    </button>
  )
}
