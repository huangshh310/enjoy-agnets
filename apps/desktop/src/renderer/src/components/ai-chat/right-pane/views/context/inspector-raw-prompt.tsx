/**
 * 原始载荷：展示 main 泵时快照或 preview，待发送芯片单独预览。
 */
import {
  RiCheckLine,
  RiClipboardLine,
  RiCompass3Line,
  RiSearchLine,
  RiTerminalBoxLine,
  RiUser3Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { SessionContextChip } from "@renderer/hooks/session-context-chips"
import { useT } from "@renderer/i18n"
import { useRawPromptView } from "./use-raw-prompt-view.ts"
import type { RawThreadMessage, RawThreadRole } from "./raw-thread-messages.ts"

export function InspectorRawPrompt({
  sessionId,
  mode,
  modelId,
  chips = []
}: {
  sessionId: string | null
  mode: AgentMode
  modelId: string
  chips?: SessionContextChip[]
}) {
  const t = useT()
  const view = useRawPromptView({ sessionId, mode, modelId, chips })
  const sourceLabel =
    view.payload?.source === "last-run"
      ? t("chat.inspectorPromptLastRun")
      : view.messageCount > 0
        ? t("chat.inspectorPromptContextPreview")
        : t("chat.inspectorPromptPreview")
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2.5 font-mono">
      <RawToolbar
        countLabel={`${sourceLabel} · ${t("chat.inspectorRawCount", { n: view.messageCount, tokens: view.totalTokens.toLocaleString() })}`}
        copied={view.copiedFull}
        copyLabel={view.copiedFull ? t("common.copied") : t("chat.inspectorRawCopy")}
        onCopy={() => {
          void navigator.clipboard.writeText(view.fullJsonString).then(() => {
            view.setCopiedFull(true)
            setTimeout(() => view.setCopiedFull(false), 2000)
          })
        }}
      />
      {view.payload?.toolNames.length ? (
        <p className="text-caption-2-regular text-text-tertiary">
          {t("chat.inspectorPromptTools")}: {view.payload.toolNames.join(", ")}
        </p>
      ) : null}
      <RawSearch
        value={view.searchQuery}
        placeholder={t("chat.inspectorRawSearch")}
        clearLabel={t("chat.inspectorRawClear")}
        onChange={view.setSearchQuery}
      />
      {view.queuedContext ? (
        <pre className="whitespace-pre-wrap break-all rounded-lg border border-dashed border-separator-border bg-background-secondary-default/40 p-2.5 text-caption-2-regular text-text-secondary">
          {t("chat.inspectorQueuedContext")}
          {"\n"}
          {view.queuedContext}
        </pre>
      ) : null}
      <RawMessageList view={view} />
    </div>
  )
}

function RawMessageList({ view }: { view: ReturnType<typeof useRawPromptView> }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
      {view.filteredMessages.map((message) => (
        <RawMessageCard
          key={message.index}
          message={message}
          expanded={view.expandedIndices.has(message.index)}
          copied={view.copiedIdx === message.index}
          onToggle={() => view.toggleExpand(message.index)}
          onCopy={() => {
            const text = typeof message.content === "string" ? message.content : message.rawText
            void navigator.clipboard.writeText(text).then(() => {
              view.setCopiedIdx(message.index)
              setTimeout(() => view.setCopiedIdx(null), 2000)
            })
          }}
        />
      ))}
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
          <pre className="whitespace-pre-wrap break-all font-mono">{message.rawText}</pre>
        </div>
      ) : null}
    </div>
  )
}

function RoleBadge({ role }: { role: RawThreadRole }) {
  if (role === "system") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 font-semibold text-accent-500">
        <RiCompass3Line className="size-2.5" />
        <span>SYSTEM</span>
      </span>
    )
  }
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
