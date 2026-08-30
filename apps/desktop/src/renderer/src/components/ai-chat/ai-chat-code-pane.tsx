"use client"

import { highlightLine } from "./ai-chat-syntax"

export function AiChatCodePane({
  path,
  value
}: {
  path: string
  value: string
}) {
  const lines = value.length > 0 ? value.split("\n") : [" "]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:thin]">
      <pre className="font-mono text-[13px] leading-6 text-text-primary">
        {lines.map((line, index) => (
          <div key={`${path}-${index}`} className="flex gap-3">
            <span className="w-5 shrink-0 text-right tabular-nums text-caption-1-medium text-text-tertiary">
              {index + 1}
            </span>
            <code className="min-w-0 whitespace-pre-wrap break-all">{highlightLine(line)}</code>
          </div>
        ))}
      </pre>
    </div>
  )
}
