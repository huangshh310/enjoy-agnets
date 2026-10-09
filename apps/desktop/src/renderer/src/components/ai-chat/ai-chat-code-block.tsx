"use client"

import { RiClipboardLine } from "@remixicon/react"
import type { CodeAttachment } from "@renderer/stores/chat-store"
import { highlightLine } from "./ai-chat-syntax"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { useT } from "@renderer/i18n"

export function AiChatCodeBlock({ attachment }: { attachment: CodeAttachment }) {
  const t = useT()
  const lines = attachment.code.split("\n")

  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="flex items-center gap-2 border-b border-separator-border px-3 py-2">
        <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-caption-1-semibold text-text-secondary">
          {attachment.language}
        </span>
        <span className="flex-1 truncate text-caption-1-medium text-text-secondary">
          {attachment.filename}
        </span>
        <span className="text-caption-1-medium text-state-success-text">
          +{attachment.additions}
        </span>
        <span className="text-caption-1-medium text-text-error-primary">
          -{attachment.deletions}
        </span>
        <QuietIconButton
          icon={RiClipboardLine}
          aria-label={t("chat.copySnippet")}
          onClick={() => navigator.clipboard.writeText(attachment.code)}
        />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-body-2-regular leading-6 text-text-primary">
        {lines.map((line, index) => (
          <div key={`${attachment.filename}-${index}`} className="flex gap-4">
            <span className="w-4 shrink-0 text-right tabular-nums text-text-tertiary">
              {index + 1}
            </span>
            <code className="whitespace-pre">{highlightLine(line)}</code>
          </div>
        ))}
      </pre>
    </div>
  )
}
