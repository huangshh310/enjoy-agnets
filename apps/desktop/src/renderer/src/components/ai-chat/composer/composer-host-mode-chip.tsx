/**
 * 无执行模式铬时不露探索/执行分段：store 切到探索后用这颗芯片说明只读围栏开着。
 */
import { RiCloseLine } from "@remixicon/react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { applyComposerSurface, surfaceForMode } from "./composer-mode"

export function ComposerHostModeChip() {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const mode = useChatStore((state) => state.mode)
  if (composerChromeFor(runtimeId).executionModes) return null
  if (surfaceForMode(mode) !== "explore") return null
  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      <span
        data-testid="composer-host-mode-chip"
        title={t("chat.hostModeHint")}
        className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-600"
      >
        <span className="truncate">{t("chat.hostModeExplore")}</span>
        <button
          type="button"
          aria-label={t("chat.removeHostMode", { name: t("chat.surfaceExplore") })}
          onClick={() => useChatStore.getState().setMode(applyComposerSurface(mode, "execute"))}
          className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full hover:bg-accent-500/15 hover:text-text-primary"
        >
          <RiCloseLine className="size-3" aria-hidden />
        </button>
      </span>
    </div>
  )
}
