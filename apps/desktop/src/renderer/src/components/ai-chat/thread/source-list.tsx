/**
 * 知识引用来源：点选打开审查，不把整篇塞进正文。
 */
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import type { ThreadMessage } from "@renderer/stores/chat-store"

import { InlineCitations, type CitationReference } from "@/components/ai-elements/inline-citations"

export function SourceList({
  sources
}: {
  sources: NonNullable<ThreadMessage["sources"]>
}) {
  if (sources.length === 0) return null

  const refs: CitationReference[] = sources.map((s, i) => ({
    n: i + 1,
    label: s.title,
    path: `${s.path}${s.startLine != null ? `:${s.startLine}` : ""}`,
    snippet: s.snippet
  }))

  return (
    <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-2.5 shadow-2xs">
      <InlineCitations
        refs={refs}
        onSelectRef={(ref) => {
          const raw = sources[ref.n - 1]
          if (raw?.path) {
            void openChangedFile(raw.path)
          }
        }}
      />
    </div>
  )
}
