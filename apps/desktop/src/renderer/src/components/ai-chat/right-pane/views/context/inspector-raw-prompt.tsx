/**
 * 原始载荷：按 toModelMessages 同构转译线程，待发送芯片单独预览。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiSearchLine,
  RiTerminalBoxLine,
  RiUser3Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { formatContextChipsForSend, type SessionContextChip } from "@renderer/hooks/session-context-chips"
import { useT } from "@renderer/i18n"
import { threadToRawMessages, type RawThreadMessage } from "./raw-thread-messages.ts"

export function InspectorRawPrompt({
  messages,
  mode,
  modelId,
  chips = []
}: {
  messages: ThreadMessage[]
  mode: AgentMode
  modelId: string
  chips?: SessionContextChip[]
}) {
  const t = useT()
  const [copiedFull, setCopiedFull] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(() => new Set([0, 1]))
  const rawMessages = useMemo(() => threadToRawMessages(messages), [messages])
  const queuedContext = formatContextChipsForSend(chips)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return rawMessages
    const query = searchQuery.toLowerCase()
    return rawMessages.filter((message) => message.rawText.toLowerCase().includes(query))
  }, [rawMessages, searchQuery])
  const totalTokens = rawMessages.reduce((sum, message) => sum + message.tokens, 0)
  const fullJsonString = useMemo(
    () =>
      JSON.stringify(
        {
          model: modelId,
          mode,
          queuedContext: queuedContext || undefined,
          messages: rawMessages.map(({ role, content }) => ({ role, content }))
        },
        null,
        2
      ),
    [modelId, mode, queuedContext, rawMessages]
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2.5 font-mono">
      <RawToolbar
        countLabel={t("chat.inspectorRawCount", { n: rawMessages.length, tokens: totalTokens.toLocaleString() })}
        copied={copiedFull}
        copyLabel={copiedFull ? t("common.copied") : t("chat.inspectorRawCopy")}
        onCopy={() => {
          void navigator.clipboard.writeText(fullJsonString).then(() => {
            setCopiedFull(true)
            setTimeout(() => setCopiedFull(false), 2000)
          })
        }}
      />
      <RawSearch
        value={searchQuery}
        placeholder={t("chat.inspectorRawSearch")}
        clearLabel={t("chat.inspectorRawClear")}
        onChange={setSearchQuery}
      />
      {queuedContext ? (
        <pre className="whitespace-pre-wrap break-all rounded-lg border border-dashed border-separator-border bg-background-secondary-default/40 p-2.5 text-caption-2-regular text-text-secondary">
          {t("chat.inspectorQueuedContext")}
          {"\n"}
          {queuedContext}
        </pre>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {filteredMessages.map((message) => (
          <RawMessageCard
            key={message.index}
            message={message}
            expanded={expandedIndices.has(message.index)}
            copied={copiedIdx === message.index}
            onToggle={() =>
              setExpandedIndices((prev) => {
                const next = new Set(prev)
                if (next.has(message.index)) next.delete(message.index)
                else next.add(message.index)
                return next
              })
            }
            onCopy={() => {
              const text =
                typeof message.content === "string"
                  ? message.content
                  : JSON.stringify(message.content, null, 2)
              void navigator.clipboard.writeText(text).then(() => {
                setCopiedIdx(message.index)
                setTimeout(() => setCopiedIdx(null), 2000)
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}

function RawToolbar({
  countLabel,
  copied,
  copyLabel,
  onCopy
}: {
  countLabel: string
  copied: boolean
  copyLabel: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5 text-caption-2-regular text-text-tertiary">
      <span>{countLabel}</span>
      <Button size="sm" variant="outline" onClick={onCopy} className="h-6.5 gap-1 px-2 text-caption-2-medium">
        {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
        <span>{copyLabel}</span>
      </Button>
    </div>
  )
}

function RawSearch({
  value,
  placeholder,
  clearLabel,
  onChange
}: {
  value: string
  placeholder: string
  clearLabel: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative flex items-center rounded-lg border border-separator-border/60 bg-background-primary-default px-2.5 py-1">
      <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="ml-2 w-full bg-transparent text-caption-2-regular text-text-primary outline-none placeholder:text-text-placeholder"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-caption-2-regular text-text-tertiary hover:text-text-primary"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  )
}

function RawMessageCard({
  message,
  expanded,
  copied,
  onToggle,
  onCopy
}: {
  message: RawThreadMessage
  expanded: boolean
  copied: boolean
  onToggle: () => void
  onCopy: () => void
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default text-caption-2-regular shadow-2xs">
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between border-b border-separator-border/40 bg-background-secondary-default/40 px-3 py-1.5 transition-colors hover:bg-background-secondary-hover/40"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-caption-2-medium text-text-tertiary">#{message.index}</span>
          <RoleBadge role={message.role} />
          <span className="truncate text-caption-2-regular text-text-secondary">~{message.tokens}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCopy()
          }}
          className="rounded p-1 text-text-tertiary transition-colors hover:text-text-primary"
        >
          {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
        </button>
      </div>
      {expanded ? (
        <div className="overflow-x-auto bg-background-primary-default p-3 leading-relaxed text-text-primary">
          <pre className="whitespace-pre-wrap break-all font-mono">
            {typeof message.content === "string" ? message.content : JSON.stringify(message.content, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

function RoleBadge({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 font-semibold text-accent-500">
        <RiUser3Line className="size-2.5" />
        <span>USER</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-background-secondary-default px-1.5 py-0.5 font-semibold text-text-secondary">
      <RiTerminalBoxLine className="size-2.5" />
      <span>ASSISTANT</span>
    </span>
  )
}
