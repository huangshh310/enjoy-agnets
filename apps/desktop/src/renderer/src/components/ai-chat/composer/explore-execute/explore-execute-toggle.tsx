/**
 * Composer 顶部分段：探索 | 执行。全引擎常驻。
 * C1 能拦截：两钮都可点，探索 = 宿主只读拦截。
 * C2 不能拦截：整组禁用 + 可见原因，禁止只灰探索、禁止整颗藏掉。
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
  const locked = !canHostInterceptExplore(runtimeId)

  function pick(next: ComposerSurface) {
    if (locked) return
    useChatStore.getState().setMode(applyComposerSurface(mode, next))
  }

  return (
    <div className={cx("inline-flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      <SurfaceGroup surface={surface} locked={locked} onPick={pick} />
      {locked ? (
        <span
          data-testid="composer-surface-disabled-reason"
          className="max-w-[14rem] text-caption-2-regular text-status-yellow-text"
        >
          {t("chat.surfaceExploreDisabled")}
        </span>
      ) : null}
    </div>
  )
}

function SurfaceGroup({
  surface,
  locked,
  onPick
}: {
  surface: ComposerSurface
  locked: boolean
  onPick: (next: ComposerSurface) => void
}) {
  const t = useT()
  return (
    <div
      role="radiogroup"
      aria-label={t("chat.surfaceSelect")}
      aria-disabled={locked || undefined}
      data-testid="composer-surface-toggle"
      className={cx(
        "inline-flex items-center rounded-full bg-background-tertiary-default/90 p-0.5 ring-1 ring-border-button-default/80",
        locked && "cursor-not-allowed opacity-50"
      )}
    >
      <SurfaceButton
        active={surface === "explore"}
        disabled={locked}
        variant="explore"
        label={t("chat.surfaceExplore")}
        onClick={() => onPick("explore")}
      />
      <SurfaceButton
        active={surface === "execute"}
        disabled={locked}
        variant="execute"
        label={t("chat.surfaceExecute")}
        onClick={() => onPick("execute")}
      />
    </div>
  )
}

function SurfaceButton({
  active,
  disabled,
  variant,
  label,
  onClick
}: {
  active: boolean
  disabled?: boolean
  variant: ComposerSurface
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      data-testid={`composer-surface-${variant}`}
      onClick={onClick}
      className={cx(
        "h-6 rounded-full px-2.5 text-caption-2-medium transition-all duration-150 select-none",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        active && variant === "explore" && "bg-accent-500/15 font-medium text-accent-600 dark:text-accent-400 shadow-2xs",
        active && variant === "execute" && "bg-accent-500 font-medium text-text-white shadow-2xs",
        !active && "text-text-tertiary",
        !active && !disabled && "hover:text-text-secondary"
      )}
    >
      {label}
    </button>
  )
}
