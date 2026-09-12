/**
 * 探索态写工具拦截条：切执行 CTA，不改审批策略。
 */
import { useState } from "react"
import { composerChromeFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { applyComposerSurface, surfaceForMode } from "../composer-mode"
import { findExploreWriteIntercept } from "./write-intercept"

export function ExploreInterceptBanner() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const messages = useChatStore((state) => state.messages)
  const [dismissedKey, setDismissedKey] = useState("")
  if (!composerChromeFor(runtimeId).executionModes) return null
  if (surfaceForMode(mode) !== "explore") return null

  const assistant = [...messages].reverse().find((row) => row.role === "assistant")
  const hit = findExploreWriteIntercept(assistant?.tools)
  if (!hit || !assistant) return null
  const key = `${assistant.id}:${hit.toolName}:${hit.path ?? ""}`
  if (dismissedKey === key) return null
  const name = hit.path || hit.toolName

  return (
    <div
      data-testid="explore-write-intercept"
      className="mx-6 mb-2 flex items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <span className="mt-1 size-2 shrink-0 rounded-full bg-status-yellow-text" aria-hidden />
      <div className="min-w-0 text-caption-1-medium">
        <p className="text-text-primary">{t("chat.surfaceInterceptTitle")}</p>
        <p className="mt-0.5 text-text-secondary">{t("chat.surfaceInterceptBody", { name })}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="h-7 cursor-pointer rounded-lg bg-accent-500 px-2.5 text-caption-1-semibold text-text-white"
            onClick={() => useChatStore.getState().setMode(applyComposerSurface(mode, "execute"))}
          >
            {t("chat.surfaceSwitchExecute")}
          </button>
          <button
            type="button"
            className="h-7 cursor-pointer rounded-lg border border-border-button-default px-2.5 text-caption-1-medium text-text-secondary"
            onClick={() => setDismissedKey(key)}
          >
            {t("chat.surfaceKeepExplore")}
          </button>
        </div>
      </div>
    </div>
  )
}
