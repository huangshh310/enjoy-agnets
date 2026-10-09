/**
 * 终端查找条：作用域只在本 PTY，皮跟本会话查找同一套 token。
 */
import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiSearchLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { TerminalSearchApi } from "./attach-xterm-addons"

export function TerminalSearchBar({
  open,
  query,
  onQuery,
  onClose,
  searchApi
}: {
  open: boolean
  query: string
  onQuery: (value: string) => void
  onClose: () => void
  searchApi: TerminalSearchApi | null
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])
  useEffect(() => {
    if (!open) {
      searchApi?.clearDecorations()
      return
    }
    if (query) searchApi?.findNext(query)
    else searchApi?.clearDecorations()
  }, [open, query, searchApi])
  if (!open) return null
  return (
    <SearchChrome
      query={query}
      inputRef={inputRef}
      placeholder={t("chat.terminalFindPlaceholder")}
      prevTitle={t("chat.terminalFindPrev")}
      nextTitle={t("chat.terminalFindNext")}
      closeTitle={t("common.close")}
      onQuery={onQuery}
      onStep={(delta) => stepSearch(searchApi, query, delta)}
      onClose={onClose}
    />
  )
}

function stepSearch(searchApi: TerminalSearchApi | null, query: string, delta: number): void {
  if (!query || !searchApi) return
  if (delta < 0) searchApi.findPrevious(query)
  else searchApi.findNext(query)
}

function SearchChrome(props: {
  query: string
  inputRef: RefObject<HTMLInputElement | null>
  placeholder: string
  prevTitle: string
  nextTitle: string
  closeTitle: string
  onQuery: (value: string) => void
  onStep: (delta: number) => void
  onClose: () => void
}) {
  return (
    <div
      data-testid="terminal-find-bar"
      className="absolute top-2 right-2 z-20 flex w-64 items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default px-2 py-1.5 shadow-card"
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
            props.onClose()
          }
        }}
        placeholder={props.placeholder}
        className="h-6 min-w-0 flex-1 bg-transparent text-caption-1-medium text-text-primary outline-hidden placeholder:text-text-secondary"
      />
      <FindIconButton title={props.prevTitle} onClick={() => props.onStep(-1)}>
        <RiArrowUpSLine className="size-3.5" aria-hidden />
      </FindIconButton>
      <FindIconButton title={props.nextTitle} onClick={() => props.onStep(1)}>
        <RiArrowDownSLine className="size-3.5" aria-hidden />
      </FindIconButton>
      <FindIconButton title={props.closeTitle} onClick={props.onClose}>
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
