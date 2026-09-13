import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { applyComposerSurface, surfaceForMode } from "../composer-mode"

export function ExploreCapabilityRail() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const runtimeId = useChatStore((state) => state.runtimeId)
  if (!composerChromeFor(runtimeId).executionModes) return null
  const explore = surfaceForMode(mode) === "explore"

  if (!explore) return null

  function switchToExecute() {
    useChatStore.getState().setMode(applyComposerSurface(mode, "execute"))
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3.5 py-1 text-caption-2-medium text-text-tertiary">
      <div className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="size-1.5 shrink-0 rounded-full bg-accent-500/80" />
        <span className="truncate">{t("chat.surfaceExploreFootnote")}</span>
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
