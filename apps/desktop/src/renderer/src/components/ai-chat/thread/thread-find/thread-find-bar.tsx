/**
 * 对话列查找条：输入、上一条/下一条、命中计数。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiSearchLine } from "@remixicon/react"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import {
  collectThreadFindMatches,
  revealThreadFindMatch,
  stepFindIndex
} from "./thread-find.logic"
import { setThreadFindOpen } from "./thread-find-store"

export function ThreadFindBar({
  open,
  messages
}: {
  open: boolean
  messages: readonly ThreadMessage[]
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const matches = useMemo(() => collectThreadFindMatches(messages, query), [messages, query])
  const safeIndex = matches.length === 0 ? 0 : Math.min(index, matches.length - 1)
  const activeId = matches[safeIndex]?.messageId ?? null
  useFindFocus(open, inputRef)
  useFindHighlight(open, activeId)
  useEffect(() => {
    setIndex(0)
  }, [query])
  if (!open) return null
  const step = (delta: number) => {
    if (matches.length === 0) return
    setIndex((current) => stepFindIndex(current, delta, matches.length))
  }
  return (
    <FindBarChrome
      query={query}
      countLabel={
        matches.length === 0
          ? t("chat.threadFindNone")
          : t("chat.threadFindCount", { n: safeIndex + 1, total: matches.length })
      }
      inputRef={inputRef}
      onQuery={setQuery}
      onStep={step}
      placeholder={t("chat.threadFindPlaceholder")}
      prevTitle={t("chat.threadFindPrev")}
      nextTitle={t("chat.threadFindNext")}
      closeTitle={t("common.close")}
    />
  )
}

function useFindFocus(open: boolean, inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, inputRef])
}

function useFindHighlight(open: boolean, activeId: string | null) {
  useEffect(() => {
    if (!open || !activeId) return
    const node = revealThreadFindMatch(activeId)
    if (!node) return
    node.setAttribute("data-thread-find-active", "true")
    node.classList.add("ring-2", "ring-accent-500")
    return () => {
      node.removeAttribute("data-thread-find-active")
      node.classList.remove("ring-2", "ring-accent-500")
    }
  }, [open, activeId])
}

function FindBarChrome(props: {
  query: string
  countLabel: string
  inputRef: RefObject<HTMLInputElement | null>
  onQuery: (value: string) => void
  onStep: (delta: number) => void
  placeholder: string
  prevTitle: string
  nextTitle: string
  closeTitle: string
}) {
  return (
    <div
      data-testid="thread-find-bar"
      data-thread-find-bar="true"
      className="absolute top-2 right-2 z-30 flex w-72 items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default px-2 py-1.5 shadow-card"
    >
      <RiSearchLine className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
      <input
        ref={props.inputRef}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            props.onStep(event.shiftKey ? -1 : 1)
          }
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            setThreadFindOpen(false)
          }
        }}
        placeholder={props.placeholder}
        className="h-6 min-w-0 flex-1 bg-transparent text-caption-1-medium text-text-primary outline-hidden placeholder:text-text-secondary"
      />
      <span className="shrink-0 text-caption-2-regular text-text-secondary">{props.countLabel}</span>
      <FindIconButton title={props.prevTitle} onClick={() => props.onStep(-1)}>
        <RiArrowUpSLine className="size-3.5" aria-hidden />
      </FindIconButton>
      <FindIconButton title={props.nextTitle} onClick={() => props.onStep(1)}>
        <RiArrowDownSLine className="size-3.5" aria-hidden />
      </FindIconButton>
      <FindIconButton title={props.closeTitle} onClick={() => setThreadFindOpen(false)}>
        <RiCloseLine className="size-3.5" aria-hidden />
      </FindIconButton>
    </div>
  )
}

function FindIconButton({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
    >
      {children}
    </button>
  )
}
