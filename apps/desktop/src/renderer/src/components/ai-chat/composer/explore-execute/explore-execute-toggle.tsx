/**
 * Composer 顶部分段：探索 | 执行。全引擎常驻；不能拦截时只禁用探索。
 */
import { canHostInterceptExplore } from "@enjoy-agents/ipc-contract/runtime-capabilities"
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
  const surface = surfaceForMode(mode)
  const canIntercept = canHostInterceptExplore(runtimeId)

  function pick(next: ComposerSurface) {
    if (next === "explore" && !canIntercept) return
    useChatStore.getState().setMode(applyComposerSurface(mode, next))
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("chat.surfaceSelect")}
      data-testid="composer-surface-toggle"
      title={!canIntercept ? t("chat.surfaceExploreDisabled") : undefined}
      className={cx(
        "inline-flex items-center rounded-full bg-background-tertiary-default/90 p-0.5 ring-1 ring-border-button-default/80",
        className
      )}
    >
      <SurfaceButton
        active={surface === "explore"}
        disabled={!canIntercept}
        variant="explore"
        label={t("chat.surfaceExplore")}
        title={!canIntercept ? t("chat.surfaceExploreDisabled") : undefined}
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
  disabled,
  variant,
  label,
  title,
  onClick
}: {
  active: boolean
  disabled?: boolean
  variant: ComposerSurface
  label: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      title={title}
      data-testid={`composer-surface-${variant}`}
      onClick={onClick}
      className={cx(
        "h-6 rounded-full px-2.5 text-caption-2-medium transition-all duration-150 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        active && variant === "explore" && "bg-accent-500/15 font-medium text-accent-600 dark:text-accent-400 shadow-2xs",
        active && variant === "execute" && "bg-accent-500 font-medium text-text-white shadow-2xs",
        !active && !disabled && "text-text-tertiary hover:text-text-secondary",
        !active && disabled && "text-text-tertiary"
      )}
    >
      {label}
    </button>
  )
}
