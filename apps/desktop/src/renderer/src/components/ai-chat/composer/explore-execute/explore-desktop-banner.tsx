/**
 * Explore 诚实条：电脑操控已开时明示没有 desktop_act，引导切执行。
 */
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { applyComposerSurface, surfaceForMode } from "../composer-mode"

export function ExploreDesktopBanner() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const enabled = useComputerUseEnabled()
  if (!enabled || surfaceForMode(mode) !== "explore") return null
  return (
    <div
      data-testid="explore-desktop-intercept"
      className="mx-6 mb-2 flex items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <span className="mt-1 size-2 shrink-0 rounded-full bg-text-warning-primary" aria-hidden />
      <div className="min-w-0 text-caption-1-medium">
        <p className="text-text-primary">{t("chat.surfaceDesktopInterceptTitle")}</p>
        <p className="mt-0.5 text-text-secondary">{t("chat.surfaceDesktopInterceptBody")}</p>
        <button
          type="button"
          className="mt-2 h-7 cursor-pointer rounded-lg bg-accent-500 px-2.5 text-caption-1-semibold text-text-white"
          onClick={() => useChatStore.getState().setMode(applyComposerSurface(mode, "execute"))}
        >
          {t("chat.surfaceSwitchExecute")}
        </button>
      </div>
    </div>
  )
}
