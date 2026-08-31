/**
 * 工作区终端：跟主题色，在输出流末尾的光标处输入。
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { cx } from "@/utils/cx"
import { PANE_FOCUS } from "../constants"
import { useTerminalSession } from "./use-terminal-session"

export function TerminalView({ workspaceId }: { workspaceId: string | null }) {
  const { sessionId, log, writeLine } = useTerminalSession(workspaceId)
  const [draft, setDraft] = useState("")
  const scroller = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [log, draft])

  useEffect(() => {
    if (sessionId) inputRef.current?.focus()
  }, [sessionId])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || !sessionId) return
    event.preventDefault()
    writeLine(draft)
    setDraft("")
  }

  if (!workspaceId) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        Open a folder to start a terminal.
      </p>
    )
  }

  return (
    <div
      className="flex min-h-0 flex-1 cursor-text flex-col overflow-hidden bg-background-primary-default"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-3 py-2">
        <pre className="font-mono text-body-2-regular text-text-primary whitespace-pre-wrap break-all">
          {log}
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onClick={(event) => event.stopPropagation()}
            disabled={!sessionId}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Terminal input"
            className={cx(
              "inline border-0 bg-transparent p-0 font-mono text-body-2-regular text-text-primary caret-accent-500 disabled:caret-transparent",
              PANE_FOCUS
            )}
            style={{ width: `${Math.max(draft.length + 1, 1)}ch` }}
          />
        </pre>
      </div>
    </div>
  )
}
