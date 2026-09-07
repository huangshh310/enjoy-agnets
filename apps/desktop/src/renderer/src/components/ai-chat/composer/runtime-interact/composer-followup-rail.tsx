/**
 * 排队任务条：默认折叠显示数量，展开后编辑 / 调序 / 立即纠偏。
 */
import { useEffect, useState } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT, type TranslateFn } from "@renderer/i18n"
import {
  getRuntimeHint,
  listFollowups,
  setRuntimeHint,
  subscribeFollowups,
  type FollowupItem,
  type RuntimeHintCode
} from "@renderer/hooks/followup-queue"
import { FollowupRow } from "./followup-row"

export function ComposerFollowupRail() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const [items, setItems] = useState<FollowupItem[]>(() => listFollowups(sessionId))
  const [hint, setHint] = useState<RuntimeHintCode>(getRuntimeHint)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    return subscribeFollowups(() => {
      setItems(listFollowups(sessionId))
      setHint(getRuntimeHint())
    })
  }, [sessionId])
  if (items.length === 0 && !hint) return null

  return (
    <div className="mx-auto mb-1.5 flex w-full flex-col gap-1">
      {hint ? (
        <div className="flex items-center gap-1 px-1">
          <p className="min-w-0 flex-1 font-mono text-caption-2-regular text-text-tertiary">
            {hintLabel(hint, t)}
          </p>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setRuntimeHint(null)}
            className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiCloseLine className="size-3" aria-hidden />
          </button>
        </div>
      ) : null}
      {items.length > 0 ? (
        <button
          type="button"
          className="px-1 text-left font-mono text-caption-2-medium text-text-secondary hover:text-text-primary"
          onClick={() => setOpen((value) => !value)}
        >
          {t("chat.runtimeQueueCount", { n: items.length })}
          <span className="ml-2 text-text-tertiary">
            {open ? t("chat.runtimeQueueCollapse") : t("chat.runtimeQueueExpand")}
          </span>
        </button>
      ) : null}
      {open
        ? items.map((item, index) => (
            <FollowupRow
              key={item.id}
              item={item}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
            />
          ))
        : null}
    </div>
  )
}

function hintLabel(hint: RuntimeHintCode, t: TranslateFn) {
  if (hint === "chipQueued") return t("chat.runtimeChipQueued")
  if (hint === "queued") return t("chat.runtimeQueuedHint")
  if (hint === "steered") return t("chat.runtimeSteeredHint")
  return ""
}
