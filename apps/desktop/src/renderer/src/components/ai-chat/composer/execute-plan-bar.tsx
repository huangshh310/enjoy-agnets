/**
 * Plan 模式提交计划后，给出「按此执行」门闩。
 */
import { useMemo } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { sendComposerMessage } from "@renderer/hooks/runtime-interact/send-composer-run"
import { useT } from "@renderer/i18n"

export function ExecutePlanBar() {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const setMode = useChatStore((state) => state.setMode)
  const plan = useMemo(() => latestSubmittedPlan(messages), [messages])
  if (mode !== "plan" || !plan || running) return null
  return (
    <div className="flex items-center justify-between gap-2 border-t border-separator-border bg-background-secondary-default/80 px-3 py-2">
      <p className="min-w-0 truncate text-caption-1-medium text-text-secondary">{t("chat.executePlanHint")}</p>
      <button
        type="button"
        className="shrink-0 rounded-md bg-accent-500 px-2.5 py-1 text-caption-2-medium text-text-white"
        onClick={() => {
          setMode("agent")
          void sendComposerMessage({ content: `${t("chat.executePlanPrompt")}\n${plan}` })
        }}
      >
        {t("chat.executePlan")}
      </button>
    </div>
  )
}

function latestSubmittedPlan(messages: Array<{ tools?: Array<{ name: string; result?: unknown }> }>): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const tools = messages[index]?.tools ?? []
    const submitted = [...tools].reverse().find((tool) => tool.name === "submit_plan")
    if (!submitted?.result || typeof submitted.result !== "object") continue
    const plan = (submitted.result as { plan?: unknown }).plan
    if (typeof plan === "string" && plan.trim()) return plan
  }
  return null
}
