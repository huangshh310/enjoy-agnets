/**
 * Composer 输入框：@ 文件引用与 / 内置命令、技能浮层。
 */
import { useMemo, useRef, type ClipboardEvent, type KeyboardEvent, type RefObject } from "react"
import { useComposerPromptHistory } from "@renderer/hooks/use-composer-prompt-history"
import { useT, type TranslateFn } from "@renderer/i18n"
import { ComposerMentionList } from "./composer-mention-list.tsx"
import { ComposerMentionPopover } from "./composer-mention-popover.tsx"
import { useComposerMentions } from "./use-composer-mentions.ts"
import type { SlashBuiltinCopy, SurfaceCopy } from "./build-mention-items.ts"

export function ComposerInput({
  value,
  onChange,
  onSend,
  onSteer,
  running,
  textareaRef,
  onPaste,
  onFocus,
  onBlur
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onSteer: () => void
  running: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  onFocus: () => void
  onBlur: () => void
}) {
  const t = useT()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const modeCopy = useMemo(() => modeCopyFromT(t), [t])
  const builtinCopy = useMemo(() => builtinCopyFromT(t), [t])
  const mentions = useComposerMentions(value, onChange, textareaRef, modeCopy, builtinCopy)
  const handleRecall = useComposerPromptHistory({ value, onChange, textareaRef })

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentions.handleKeyDown(event)) return
    if (handleRecall(event)) return
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    if (event.metaKey || event.ctrlKey) onSteer()
    else onSend()
  }

  return (
    <div ref={wrapRef} className="relative px-3.5 py-1">
      {mentions.open && mentions.kind ? (
        <ComposerMentionPopover anchorRef={wrapRef}>
          <ComposerMentionList
            kind={mentions.kind}
            items={mentions.items}
            activeIndex={mentions.activeIndex}
            onPick={(item) => void mentions.pick(item)}
            listRef={mentions.listRef}
          />
        </ComposerMentionPopover>
      ) : null}
      <textarea
        ref={textareaRef}
        data-testid="composer-input"
        rows={2}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          mentions.setCursor(event.target.selectionStart ?? event.target.value.length)
        }}
        onKeyDown={onKeyDown}
        onKeyUp={() => mentions.syncCursor()}
        onClick={() => mentions.syncCursor()}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={running ? t("chat.placeholderRunning") : t("chat.placeholder")}
        className="max-h-48 min-h-[52px] w-full resize-none bg-transparent py-1.5 text-body-medium text-text-primary outline-none placeholder:text-text-secondary/70"
      />
    </div>
  )
}

function modeCopyFromT(t: TranslateFn): SurfaceCopy {
  return {
    explore: { label: t("chat.surfaceExplore"), description: t("chat.surfaceExploreDesc") },
    execute: { label: t("chat.surfaceExecute"), description: t("chat.surfaceExecuteDesc") }
  }
}

function builtinCopyFromT(t: TranslateFn): SlashBuiltinCopy {
  return {
    compactDescription: t("chat.mentionCompactDesc"),
    builtinTag: t("chat.mentionBuiltinGroup")
  }
}
