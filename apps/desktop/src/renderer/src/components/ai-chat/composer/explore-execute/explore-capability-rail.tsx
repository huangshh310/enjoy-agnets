/**
 * 探索态单行能力轨：只读脚注 + 可选「桌面仅执行」芯片，不注册 desktop_*。
 */
import { useComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { applyComposerSurface, surfaceForMode } from "../composer-mode"

export function ExploreCapabilityRail() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const explore = surfaceForMode(mode) === "explore"
  const desktopOn = useComputerUseEnabled()

  if (!explore) return null

  function switchToExecute() {
    useChatStore.getState().setMode(applyComposerSurface(mode, "execute"))
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3.5 py-1 text-caption-2-medium text-text-secondary">
      <div className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="size-1.5 shrink-0 rounded-full bg-accent-500/80" />
        <span className="truncate">{t("chat.surfaceExploreFootnote")}</span>
        {desktopOn ? (
          <span
            data-testid="explore-desktop-execute-only"
            className="shrink-0 rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-2-semibold text-status-yellow-text ring-1 ring-border-button-default"
          >
            {t("chat.surfaceDesktopExecuteOnly")}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={switchToExecute}
        className="shrink-0 cursor-pointer font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400"
      >
        {t("chat.surfaceExecute")}
      </button>
    </div>
  )
}
