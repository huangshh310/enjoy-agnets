/**
 * 转录左下角的子任务计数。点开名单，不占 Composer 帽檐。
 */
import { useState } from "react"
import { RiNodeTree } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useT } from "@renderer/i18n"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { selectCurrentTurnDelegates } from "./select-current-delegates"
import { SubagentPillList } from "./subagent-pill-list"

export function SubagentPill({ messages }: { messages: ThreadMessage[] }) {
  const t = useT()
  const items = selectCurrentTurnDelegates(messages)
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <div className="pointer-events-none absolute bottom-3 left-8 z-20">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="subagent-pill"
            className="pointer-events-auto inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 text-caption-1-medium text-text-primary shadow-card"
          >
            <RiNodeTree className="size-3.5 text-accent-500" aria-hidden />
            {t("chat.subagentPill", { count: items.length })}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-72 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-card"
        >
          <SubagentPillList items={items} t={t} onClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
