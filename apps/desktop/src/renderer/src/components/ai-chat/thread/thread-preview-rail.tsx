/**
 * 会话右侧刻度：只收有正文的用户句。少于两句不出现。点击滚到该句。
 * 整个浮层 pointer-events:none，只有刻度按钮可点，不挡下面消息的按钮。
 */
"use client"

import { useEffect, useMemo, useState } from "react"
import { cx } from "@/utils/cx"
import { PreviewRail } from "@/components/ai-elements/preview-rail"
import { useT } from "@renderer/i18n"
import { previewItemsFromMessages, railItemSize } from "./thread-preview-rail-items"
import { promptScaleItems } from "./prompt-scale"
import { requestTurnReveal } from "@renderer/lib/thread-turn-reveal"
import { visibleUserText } from "@renderer/lib/user-message-text"

const MESSAGE_ATTR = "data-thread-message"

export function ThreadPreviewRail({
  messages,
  hasLedger = false
}: {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>
  hasLedger?: boolean
}) {
  const t = useT()
  const items = useMemo(() => userScaleItems(messages, t), [messages, t])
  const [activeId, setActiveId] = useActiveThreadMessage(messages)

  if (items.length < 2) return null

  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-y-8 right-2 z-20 hidden min-[768px]:flex w-64 items-center justify-end",
        hasLedger && "min-[1100px]:hidden"
      )}
    >
      <PreviewRail
        items={items}
        label={t("chat.previewRailLabel")}
        activeId={activeId}
        itemSize={railItemSize(items.length)}
        // 外框约 256×256 只是给悬停预览留位，透明处必须让点击穿透到消息（编辑/重来/复制/保存/取消）。
        // 只有刻度按钮自己接指针事件。
        className="pointer-events-none h-[min(28rem,72%)] w-full"
        railClassName="pointer-events-none [&>[data-slot=preview-rail-item]]:pointer-events-auto"
        onActiveChange={setActiveId}
        onItemSelect={(item) => scrollToThreadMessage(item.id)}
      />
    </div>
  )
}

function useActiveThreadMessage(messages: Array<{ id: string }>): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState(messages.at(-1)?.id ?? "")
  useEffect(() => {
    setActiveId((current) => (messages.some((item) => item.id === current) ? current : (messages.at(-1)?.id ?? "")))
  }, [messages])
  useEffect(() => watchVisibleMessage(messages.length, setActiveId), [messages])
  return [activeId, setActiveId]
}

function watchVisibleMessage(count: number, setActiveId: (id: string) => void): () => void {
  if (count < 2) return () => undefined
  const nodes = [...document.querySelectorAll<HTMLElement>(`[${MESSAGE_ATTR}]`)]
  if (nodes.length === 0) return () => undefined
  const observer = new IntersectionObserver((entries) => {
    const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    const id = hit?.target.getAttribute(MESSAGE_ATTR)
    if (id) setActiveId(id)
  }, { threshold: [0.25, 0.5, 0.8] })
  for (const node of nodes) observer.observe(node)
  return () => observer.disconnect()
}

function userScaleItems(
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>,
  t: (path: string) => string
) {
  const prompts = promptScaleItems(
    messages.map((message) => ({
      ...message,
      content: message.role === "user" ? visibleUserText(message.content) : message.content
    }))
  )
  return previewItemsFromMessages(
    prompts.map((item) => ({ id: item.id, role: "user" as const, content: item.label })),
    {
      user: t("chat.previewRailUser"),
      assistant: t("chat.previewRailAssistant"),
      empty: t("chat.previewRailEmpty")
    }
  )
}

function scrollToThreadMessage(id: string) {
  requestTurnReveal(id)
  const node = document.querySelector<HTMLElement>(`[${MESSAGE_ATTR}="${CSS.escape(id)}"]`)
  node?.scrollIntoView({ behavior: "smooth", block: "center" })
}
