/**
 * ACP 底栏不露执行模式菜单：/plan 切 store 后用这颗芯片告诉用户宿主协作模式开着。
 */
import { RiCloseLine } from "@remixicon/react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { coerceComposerMode, type ComposerVisibleMode } from "./composer-mode"

export function ComposerHostModeChip() {
  const t = useT()
  const runtimeId = useChatStore((state) => state.runtimeId)
  const mode = coerceComposerMode(useChatStore((state) => state.mode))
  if (composerChromeFor(runtimeId).executionModes) return null
  if (mode === "agent") return null
  const label = hostModeLabel(mode, t)
  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      <span
        data-testid="composer-host-mode-chip"
        title={t("chat.hostModeHint")}
        className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-600"
      >
        <span className="truncate">/{mode} {label}</span>
        <button
          type="button"
          aria-label={t("chat.removeHostMode", { name: label })}
          onClick={() => useChatStore.getState().setMode("agent")}
          className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full hover:bg-accent-500/15 hover:text-text-primary"
        >
          <RiCloseLine className="size-3" aria-hidden />
        </button>
      </span>
    </div>
  )
}

function hostModeLabel(mode: Exclude<ComposerVisibleMode, "agent">, t: (key: string) => string): string {
  if (mode === "plan") return t("chat.hostModePlan")
  if (mode === "ask") return t("chat.hostModeAsk")
  return t("chat.hostModeDebug")
}
