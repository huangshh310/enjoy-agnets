/**
 * Knowledge：来源、索引状态、检索结果。只索引用户显式选择的路径。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiBookOpenLine, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useNavigate } from "@tanstack/react-router"
import type { KnowledgeHit, KnowledgeSource } from "@enjoy-agents/ipc-contract"

export function KnowledgePage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [path, setPath] = useState(".")
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<KnowledgeHit[]>([])
  const [rerank, setRerank] = useState(false)
  const navigate = useNavigate()

  const sourcesQuery = useQuery({
    queryKey: ["knowledge", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().knowledge.sources(workspaceId!) as Promise<KnowledgeSource[]>
  })
  const sources = sourcesQuery.data ?? []

  const groups = useMemo(
    () => [
      {
        id: "sources",
        label: "Sources",
        items: [
          { id: "all", label: "All sources", icon: RiBookOpenLine, meta: String(sources.length) }
        ]
      }
    ],
    [sources.length]
  )

  async function addAndIndex() {
    if (!workspaceId) return
    const source = (await getIde().knowledge.addSource({ workspaceId, path })) as KnowledgeSource
    await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
    await getIde().knowledge.index({ sourceId: source.id, rebuild: false })
    await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
  }

  async function search() {
    if (!workspaceId || !query.trim()) return
    const result = (await getIde().knowledge.search({
      workspaceId,
      query: query.trim(),
      limit: 8,
      rerank
    })) as KnowledgeHit[]
    setHits(result)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter sources..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 data-testid="page-knowledge" className="text-title-3-semibold text-text-primary">
            Knowledge
          </h1>
          <p className="mt-1 text-body-medium text-text-secondary">
            Index folders you choose. .git, secrets, and gitignore matches stay out.
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={path} onChange={(event) => setPath(event.target.value)} placeholder="src" />
          <Button size="sm" data-testid="knowledge-add-index" onClick={() => void addAndIndex()} disabled={!workspaceId}>
            Add & index
          </Button>
        </div>
        <ul className="divide-y divide-separator-border rounded-2xl border border-border-button-default">
          {sources.map((source) => (
            <li key={source.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-body-medium text-text-primary">{source.path}</p>
                <p className="text-caption-1-medium text-text-tertiary">
                  {source.status} · {source.chunkCount} chunks
                  {source.embeddingsStale ? " · embedding stale — Resume to re-embed" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void getIde()
                      .knowledge.cancel(source.id)
                      .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                  }
                >
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void getIde()
                      .knowledge.index({ sourceId: source.id, rebuild: false })
                      .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                  }
                >
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void getIde()
                      .knowledge.index({ sourceId: source.id, rebuild: true })
                      .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                  }
                >
                  Rebuild
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void getIde().knowledge.remove(source.id).then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {sources.length === 0 ? (
            <li className="px-4 py-6 text-body-medium text-text-secondary">No sources yet.</li>
          ) : null}
        </ul>
        <div className="flex gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indexed chunks" />
          <Button size="sm" variant="outline" onClick={() => void search()}>
            <RiSearchLine className="size-4" aria-hidden />
            Search
          </Button>
          <Button
            size="sm"
            variant={rerank ? "default" : "outline"}
            onClick={() => setRerank((value) => !value)}
          >
            {rerank ? "Rerank on" : "Rerank off"}
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {hits.map((hit) => (
            <li key={hit.chunkId} className="rounded-2xl border border-border-button-default px-4 py-3">
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  void openChangedFile(hit.path)
                  void navigate({ to: "/" })
                }}
              >
                <p className="text-body-medium text-text-tertiary">
                  {hit.path}
                  {hit.startLine ? `:${hit.startLine}` : ""}
                </p>
                <p className="mt-1 text-body-medium text-text-secondary">{hit.snippet}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SecondaryPageShell>
  )
}
