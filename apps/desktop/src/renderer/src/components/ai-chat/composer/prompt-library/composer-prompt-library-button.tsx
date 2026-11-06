/**
 * Composer 旁 mute 书签入口「提示收藏」。
 * 不进引擎 flyout「启动预设」；上浮 popover 贴 Composer 上方。
 */
import { useState } from "react"
import { RiBookmarkLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useT } from "@renderer/i18n"
import { showAppToast } from "@renderer/lib/app-toast"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { ComposerPromptLibraryPopover } from "./composer-prompt-library-popover.tsx"
import { insertPromptLibraryText } from "./insert-prompt-library.ts"
import { usePromptLibrary } from "./use-prompt-library.ts"
import type { PromptLibraryRow } from "./prompt-library-types.ts"

export function ComposerPromptLibraryButton() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const running = useChatStore((s) => s.running)
  const library = usePromptLibrary(open)

  const handleInsert = (row: PromptLibraryRow) => {
    const result = insertPromptLibraryText(row.text)
    showAppToast(t("chat.promptLibraryInserted"), {
      duration: 1500,
      testId: "prompt-library-inserted-toast"
    })
    if (result.running) {
      // 旁注已在面板底；toast 仍用「已插入」诚实口径，不说已发送
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="prompt-library-button"
          aria-label={t("chat.promptLibraryTitle")}
          title={t("chat.promptLibraryTitle")}
          aria-expanded={open}
          className={cx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
            "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            open && "bg-background-secondary-hover text-text-secondary ring-1 ring-accent-500/25"
          )}
        >
          <RiBookmarkLine className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-auto border-none bg-transparent p-0 shadow-none"
        onOpenAutoFocus={(event) => {
          // 让搜框可聚焦，但不抢死
          event.preventDefault()
          const root = event.currentTarget as HTMLElement
          root.querySelector<HTMLInputElement>('[data-testid="prompt-library-search"]')?.focus()
        }}
      >
        <ComposerPromptLibraryPopover
          query={library.query}
          onQueryChange={library.setQuery}
          starred={library.starred}
          recent={library.recent}
          empty={library.empty}
          onInsert={handleInsert}
          onToggleStar={(row) => void library.toggleStar(row)}
          onClose={() => setOpen(false)}
          running={running}
        />
      </PopoverContent>
    </Popover>
  )
}
