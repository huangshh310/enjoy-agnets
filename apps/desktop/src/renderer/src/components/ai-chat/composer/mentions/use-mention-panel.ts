/**
 * @ / 面板开合：光标、点外部收起、工具栏插入触发符。
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from "react"
import { detectActiveMention } from "./composer-token.ts"
import { insertMentionTrigger } from "./insert-mention-trigger.ts"
import { registerMentionOpener } from "./mention-open.ts"
import {
  buildAtMentionItems,
  buildSlashMentionItems,
  type MentionDoc,
  type SlashBuiltinCopy,
  type SurfaceCopy
} from "./build-mention-items.ts"
import type { MentionDirEntry } from "./collect-mention-files.ts"
import type { MentionItem } from "./mention-items.ts"

export function useMentionPanel(
  value: string,
  onChange: (next: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  roots: readonly MentionDirEntry[],
  files: readonly MentionDirEntry[],
  docs: readonly MentionDoc[],
  modeCopy: SurfaceCopy,
  builtinCopy: SlashBuiltinCopy
) {
  const [cursor, setCursor] = useState(value.length)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const mention = useMemo(() => detectActiveMention(value, cursor), [value, cursor])
  const open = Boolean(mention && !dismissed)
  const items = useMemo(
    () => listItems(mention?.kind, mention?.query ?? "", roots, files, docs, modeCopy, builtinCopy),
    [mention?.kind, mention?.query, roots, files, docs, modeCopy, builtinCopy]
  )

  useLayoutEffect(() => {
    const node = textareaRef.current
    if (node) setCursor(node.selectionStart ?? value.length)
  }, [textareaRef, value])

  useEffect(() => {
    setActiveIndex(0)
    setDismissed(false)
  }, [mention?.kind, mention?.start, mention?.query])

  useMentionOpener(value, onChange, textareaRef, setCursor)
  useDismissOnPointer(open, textareaRef, listRef, setDismissed)

  return { mention, open, items, activeIndex, setActiveIndex, setDismissed, setCursor, listRef }
}

function useMentionOpener(
  value: string,
  onChange: (next: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  setCursor: (cursor: number) => void
) {
  useEffect(() => {
    return registerMentionOpener((kind) => {
      const at = textareaRef.current?.selectionStart ?? value.length
      const next = insertMentionTrigger(value, at, kind === "at" ? "@" : "/")
      onChange(next.text)
      setCursor(next.cursor)
      queueMicrotask(() => {
        const node = textareaRef.current
        if (!node) return
        node.focus()
        node.setSelectionRange(next.cursor, next.cursor)
      })
    })
  }, [onChange, setCursor, textareaRef, value])
}

function useDismissOnPointer(
  open: boolean,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  listRef: RefObject<HTMLDivElement | null>,
  setDismissed: (dismissed: boolean) => void
) {
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (textareaRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setDismissed(true)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [listRef, open, setDismissed, textareaRef])
}

function listItems(
  kind: "at" | "slash" | undefined,
  query: string,
  roots: readonly MentionDirEntry[],
  files: readonly MentionDirEntry[],
  docs: readonly MentionDoc[],
  modeCopy: SurfaceCopy,
  builtinCopy: SlashBuiltinCopy
): MentionItem[] {
  if (kind === "at") return buildAtMentionItems(query, roots, files, docs)
  if (kind === "slash") return buildSlashMentionItems(query, modeCopy, builtinCopy)
  return []
}
