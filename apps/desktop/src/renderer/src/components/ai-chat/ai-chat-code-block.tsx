"use client"

import { useState } from "react"
import { RiClipboardLine } from "@remixicon/react"
import type { CodeAttachment } from "@renderer/stores/chat-store"
import { highlightLine } from "./ai-chat-syntax"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { useT } from "@renderer/i18n"

export function AiChatCodeBlock({ attachment }: { attachment: CodeAttachment }) {
  const t = useT()
  const lines = attachment.code.split("\n")
  const [expanded, setExpanded] = useState(false)
  const collapsed = lines.length > 16 && !expanded
  const visible = collapsed ? lines.slice(0, 16) : lines

  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-[#1A1612] text-[#F5F0E8] shadow-card">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-caption-1-semibold text-[#F5F0E8]/90">
          {attachment.language}
        </span>
        <span className="flex-1 truncate text-caption-1-medium text-[#F5F0E8]/70">
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
      <pre className="overflow-x-auto p-3 font-mono text-body-2-regular leading-6 text-[#F5F0E8]">
        {visible.map((line, index) => (
          <div key={`${attachment.filename}-${index}`} className="flex gap-4">
            <span className="w-4 shrink-0 text-right tabular-nums text-[#F5F0E8]/40">
              {index + 1}
            </span>
            <code className="whitespace-pre-wrap break-words">{highlightLine(line)}</code>
          </div>
        ))}
      </pre>
      {lines.length > 16 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full cursor-pointer border-t border-white/10 px-3 py-1.5 text-left text-caption-2-medium text-[#F5F0E8]/70 hover:bg-white/5"
        >
          {expanded ? t("chat.collapseLines") : t("chat.showAllLines")}
        </button>
      ) : null}
    </div>
  )
}
