/**
 * 助手轮末尾的计划卡片。按钮只出现在最后一次 submit_plan 上。
 */
import { useState } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { sendComposerMessage } from "@renderer/hooks/runtime-interact/send-composer-run"
import { useT } from "@renderer/i18n"
import { latestPlanLocation, planCardFromText, planTextFromResult } from "./plan-card-text"

export function PlanCard({ messageId }: { messageId: string }) {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const running = useChatStore((state) => state.running)
  const messages = useChatStore((state) => state.messages)
  const setMode = useChatStore((state) => state.setMode)
  const [open, setOpen] = useState(false)
  const latest = latestPlanLocation(messages)
  const own = planOnMessage(messages, messageId)
  if (!own) return null
  const card = planCardFromText(own)
  const actionable = mode === "plan" && !running && latest?.messageId === messageId
  return (
    <section className="mt-3 max-w-[36rem] rounded-2xl border border-separator-border bg-background-secondary-default/70 p-3">
      <h3 className="text-body-2-semibold text-text-primary">{card.title}</h3>
      {card.preview.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {card.preview.map((line) => (
            <li key={line} className="text-caption-1-regular text-text-secondary">{line}</li>
          ))}
        </ul>
      ) : null}
      {card.rest && open ? <p className="mt-2 whitespace-pre-wrap text-caption-1-regular text-text-secondary">{card.rest}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        {card.rest ? (
          <button type="button" className="cursor-pointer text-caption-2-medium text-text-tertiary" onClick={() => setOpen((value) => !value)}>
            {open ? t("chat.planCardLess") : t("chat.planCardMore")}
          </button>
        ) : null}
        {actionable ? (
          <button
            type="button"
            className="cursor-pointer rounded-md bg-accent-500 px-2.5 py-1 text-caption-2-medium text-text-white"
            onClick={() => {
              setMode("agent")
              void sendComposerMessage({ content: t("chat.executePlanPrompt"), executePlan: true })
            }}
          >
            {t("chat.executePlan")}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function planOnMessage(
  messages: ReadonlyArray<{ id: string; tools?: ReadonlyArray<{ name: string; result?: unknown }> }>,
  messageId: string
): string | null {
  const message = messages.find((item) => item.id === messageId)
  if (!message) return null
  const submitted = [...(message.tools ?? [])].reverse().find((tool) => tool.name === "submit_plan")
  return planTextFromResult(submitted?.result)
}
