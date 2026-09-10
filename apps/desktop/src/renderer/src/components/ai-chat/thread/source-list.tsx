/**
 * 知识引用来源：点选跳回知识页定位 snippet。
 */
import { useNavigate } from "@tanstack/react-router"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { knowledgeSearchFromSource } from "@renderer/components/knowledge/lib/knowledge-route-search"

import { InlineCitations, type CitationReference } from "@/components/ai-elements/inline-citations"

export function SourceList({
  sources
}: {
  sources: NonNullable<ThreadMessage["sources"]>
}) {
  const navigate = useNavigate()
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
          if (!raw?.path) return
          void navigate({ to: "/knowledge", search: knowledgeSearchFromSource(raw) })
        }}
      />
    </div>
  )
}
