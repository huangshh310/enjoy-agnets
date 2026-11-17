/**
 * 会话右侧刻度：只收有正文的用户句。少于两句不出现。点击滚到该句。
 * 整个浮层 pointer-events:none，只有刻度按钮可点，不挡下面消息的按钮。
 */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cx } from "@/utils/cx"
import { PreviewRail } from "@/components/ai-elements/preview-rail"
import { useT } from "@renderer/i18n"
import { previewItemsFromMessages, railItemSize } from "./thread-preview-rail-items"
import { promptScaleItems } from "./prompt-scale"
import { revealThreadMessage } from "@renderer/lib/search-thread-messages"
import { visibleUserText } from "@renderer/lib/user-message-text"
import { pickRailActive, resolveRailActive, type RailVisible } from "./thread-preview-rail-active"

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
  const itemIds = useMemo(() => items.map((item) => item.id), [items])
  const [activeId, setActiveId] = useActiveThreadMessage(messages, itemIds)

  if (items.length < 2) return null

  return (
    <div
      data-testid="thread-preview-rail"
      className={cx(
        "pointer-events-none absolute inset-y-8 right-2 z-20 hidden min-[768px]:flex w-64 items-center justify-end",
        hasLedger && "min-[1100px]:hidden"
      )}
    >
      <PreviewRail
        items={items}
        label={t("chat.previewRailLabel")}
        activeId={resolveRailActive(activeId, itemIds)}
        itemSize={railItemSize(items.length)}
        // 外框约 256×256 只是给悬停预览留位，透明处必须让点击穿透到消息（编辑/重来/复制/保存/取消）。
        // 只有刻度按钮自己接指针事件。
        className="pointer-events-none h-[min(28rem,72%)] w-full"
        railClassName="pointer-events-none [&>[data-slot=preview-rail-item]]:pointer-events-auto"
        onActiveChange={setActiveId}
        onItemSelect={(item) => revealThreadMessage(item.id)}
      />
    </div>
  )
}

function useActiveThreadMessage(messages: Array<{ id: string }>, itemIds: string[]): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState(() => resolveRailActive("", itemIds))
  const activeRef = useRef(activeId)
  activeRef.current = activeId
  useEffect(() => {
    setActiveId((current) => resolveRailActive(current, itemIds))
  }, [itemIds])
  useEffect(
    () => watchVisibleMessage(messages.map((m) => m.id), itemIds, () => activeRef.current, setActiveId),
    [messages, itemIds]
  )
  return [activeId, setActiveId]
}

function watchVisibleMessage(
  order: string[],
  itemIds: string[],
  previous: () => string,
  setActiveId: (id: string) => void
): () => void {
  if (itemIds.length < 2) return () => undefined
  const nodes = [...document.querySelectorAll<HTMLElement>(`[${MESSAGE_ATTR}]`)]
  if (nodes.length === 0) return () => undefined
  // 回调只给「跨过阈值」的那几条：可见集合跨回调累积，每次在全部可见节点里挑（面积为 0 / 不在视口内的剔掉）。
  const visible = new Map<string, RailVisible>()
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.getAttribute(MESSAGE_ATTR)
      if (!id) continue
      const area = entry.intersectionRect.width * entry.intersectionRect.height
      if (entry.isIntersecting && area > 0) visible.set(id, { ratio: entry.intersectionRatio, area })
      else visible.delete(id)
    }
    const next = pickRailActive({ visible, order, itemIds, previous: previous() })
    if (next !== previous()) setActiveId(next)
  }, { threshold: [0, 0.25, 0.5, 0.8] })
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
