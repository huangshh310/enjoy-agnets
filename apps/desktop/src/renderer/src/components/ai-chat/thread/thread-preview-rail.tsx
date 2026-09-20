/**
 * 会话右侧 Preview Rail：一条消息一刻度，悬停预览，点击滚到该轮。
 */
"use client"

import { useEffect, useMemo, useState } from "react"
import { cx } from "@/utils/cx"
import { PreviewRail } from "@/components/ai-elements/preview-rail"
import { useT } from "@renderer/i18n"
import { previewItemsFromMessages, railItemSize } from "./thread-preview-rail-items"

const MESSAGE_ATTR = "data-thread-message"

export function ThreadPreviewRail({
  messages,
  hasLedger = false
}: {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>
  hasLedger?: boolean
}) {
  const t = useT()
  const [activeId, setActiveId] = useState(messages.at(-1)?.id ?? "")
  const items = useMemo(
    () =>
      previewItemsFromMessages(messages, {
        user: t("chat.previewRailUser"),
        assistant: t("chat.previewRailAssistant"),
        empty: t("chat.previewRailEmpty")
      }),
    [messages, t]
  )

  useEffect(() => {
    setActiveId((current) => (messages.some((item) => item.id === current) ? current : (messages.at(-1)?.id ?? "")))
  }, [messages])

  useEffect(() => {
    if (messages.length < 2) return
    const nodes = [...document.querySelectorAll<HTMLElement>(`[${MESSAGE_ATTR}]`)]
    if (nodes.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = hit?.target.getAttribute(MESSAGE_ATTR)
        if (id) setActiveId(id)
      },
      { threshold: [0.25, 0.5, 0.8] }
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [messages])

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
        className="pointer-events-auto h-[min(28rem,72%)] w-full"
        onActiveChange={setActiveId}
        onItemSelect={(item) => scrollToThreadMessage(item.id)}
      />
    </div>
  )
}

function scrollToThreadMessage(id: string) {
  const node = document.querySelector<HTMLElement>(`[${MESSAGE_ATTR}="${CSS.escape(id)}"]`)
  node?.scrollIntoView({ behavior: "smooth", block: "center" })
}
