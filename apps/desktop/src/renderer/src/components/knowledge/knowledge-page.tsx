/**
 * Knowledge：来源管理、实时索引状态、语义检索与分块测试器。只索引用户显式选择的路径。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiArrowRightUpLine,
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiDatabase2Line,
  RiDeleteBinLine,
  RiFileCodeLine,
  RiFileLine,
  RiFolderAddLine,
  RiFolderLine,
  RiInformationLine,
  RiLoader4Line,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiRefreshLine,
  RiSearchLine,
  RiSparklingLine,
  RiTimeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useNavigate } from "@tanstack/react-router"
import type { KnowledgeHit, KnowledgeSource } from "@enjoy-agents/ipc-contract"

const QUICK_PATHS = [
  { label: "Whole workspace", path: "." },
  { label: "src/", path: "src" },
  { label: "docs/", path: "docs" },
  { label: "packages/", path: "packages" }
]

export function KnowledgePage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [path, setPath] = useState("src")
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<KnowledgeHit[]>([])
  const [rerank, setRerank] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null)
  const navigate = useNavigate()

  const sourcesQuery = useQuery({
    queryKey: ["knowledge", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().knowledge.sources(workspaceId!) as Promise<KnowledgeSource[]>,
    refetchInterval: (query) => {
      const data = query.state.data as KnowledgeSource[] | undefined
      return data?.some((s) => s.status === "indexing") ? 1500 : false
    }
  })
  const sources = sourcesQuery.data ?? []
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunkCount || 0), 0)

  const groups = useMemo(
    () => [
      {
        id: "sources",
        label: "Knowledge Base",
        items: [
          {
            id: "all",
            label: "All sources",
            icon: RiBookOpenLine,
            meta: String(sources.length)
          }
        ]
      }
    ],
    [sources.length]
  )

  async function addAndIndex(targetPath?: string) {
    const finalPath = targetPath ?? path
    if (!workspaceId || !finalPath.trim() || isAdding) return
    setIsAdding(true)
    try {
      const source = (await getIde().knowledge.addSource({
        workspaceId,
        path: finalPath.trim()
      })) as KnowledgeSource
      await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
      await getIde().knowledge.index({ sourceId: source.id, rebuild: false })
      await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
    } finally {
      setIsAdding(false)
    }
  }

  async function search() {
    if (!workspaceId || !query.trim() || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const result = (await getIde().knowledge.search({
        workspaceId,
        query: query.trim(),
        limit: 10,
        rerank
      })) as KnowledgeHit[]
      setHits(result)
    } finally {
      setIsSearching(false)
    }
  }

  function handleCopySnippet(chunkId: string, snippet: string) {
    void navigator.clipboard.writeText(snippet)
    setCopiedChunkId(chunkId)
    setTimeout(() => setCopiedChunkId(null), 2000)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter sources..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-xs">
              <RiBookOpenLine className="size-5" />
            </div>
            <h1 data-testid="page-knowledge" className="text-title-3-semibold text-text-primary">
              Knowledge Base
            </h1>
          </div>
          <p className="text-body-medium text-text-secondary">
            Index local directories and documents for deterministic RAG retrieval. Automatically
            ignores <code className="rounded bg-background-tertiary-default px-1.5 py-0.5 font-mono text-[12px]">.git</code>,
            keys, and <code className="rounded bg-background-tertiary-default px-1.5 py-0.5 font-mono text-[12px]">.gitignore</code> rules.
          </p>
        </header>

        {/* Add Source Card */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <RiFolderAddLine className="size-4 text-accent-500" />
              <h3 className="text-body-medium font-semibold text-text-primary">
                Add Knowledge Source
              </h3>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              Relative to workspace root
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <RiFolderLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
                <Input
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addAndIndex()
                  }}
                  placeholder="e.g. src, docs, packages/core"
                  className="pl-9 bg-background-secondary-default focus-visible:bg-background-primary-default"
                />
              </div>

              <Button
                size="sm"
                data-testid="knowledge-add-index"
                onClick={() => void addAndIndex()}
                disabled={!workspaceId || !path.trim() || isAdding}
                className="gap-1.5 shadow-xs shrink-0"
              >
                {isAdding ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiAddLine className="size-4" />
                )}
                <span>Add & Index</span>
              </Button>
            </div>

            {/* Quick Paths */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption-2-medium text-text-tertiary">Quick suggestions:</span>
              {QUICK_PATHS.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    setPath(item.path)
                    void addAndIndex(item.path)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 text-caption-2-medium text-text-secondary hover:border-accent-500/40 hover:bg-background-secondary-hover hover:text-text-primary transition-all"
                >
                  <RiFolderLine className="size-3 text-text-tertiary" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sources Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                Indexed Sources ({sources.length})
              </h3>
              {totalChunks > 0 ? (
                <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
                  {totalChunks} total chunks
                </span>
              ) : null}
            </div>
          </div>

          {sources.length === 0 ? (
            <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-6 py-8 text-center">
              <RiDatabase2Line className="size-8 text-text-tertiary" />
              <p className="mt-2 text-body-medium font-semibold text-text-primary">
                No sources indexed yet
              </p>
              <p className="mt-1 max-w-sm text-caption-1-medium text-text-secondary">
                Add workspace folders or documentation files above to allow the agent to cite and
                retrieve relevant context.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {sources.map((source) => (
                <article
                  key={source.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-secondary shadow-xs">
                        {source.kind === "directory" ? (
                          <RiFolderLine className="size-5" />
                        ) : (
                          <RiFileLine className="size-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="truncate font-mono text-body-medium font-semibold text-text-primary">
                            {source.path}
                          </h4>
                          <SourceStatusBadge
                            status={source.status}
                            stale={source.embeddingsStale}
                          />
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-caption-2-medium text-text-tertiary flex-wrap">
                          <span>{source.chunkCount} chunks</span>
                          <span>·</span>
                          <span>{source.documentCount} documents</span>
                          {source.embeddingModelId ? (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px]">
                                {source.embeddingModelId}
                              </span>
                            </>
                          ) : null}
                          {source.embeddingsStale ? (
                            <>
                              <span>·</span>
                              <span className="text-amber-500">embedding stale</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Source Action Toolbar */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {source.status === "indexing" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-amber-600 dark:text-amber-400"
                          onClick={() =>
                            void getIde()
                              .knowledge.cancel(source.id)
                              .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                          }
                        >
                          <RiPauseCircleLine className="size-3.5" />
                          <span>Pause</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            void getIde()
                              .knowledge.index({ sourceId: source.id, rebuild: false })
                              .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                          }
                        >
                          <RiPlayCircleLine className="size-3.5" />
                          <span>{source.embeddingsStale ? "Re-embed" : "Sync"}</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        title="Rebuild all chunks from scratch"
                        className="gap-1"
                        onClick={() =>
                          void getIde()
                            .knowledge.index({ sourceId: source.id, rebuild: true })
                            .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                        }
                      >
                        <RiRefreshLine className="size-3.5" />
                        <span>Rebuild</span>
                      </Button>

                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Remove knowledge source"
                        className="text-text-tertiary hover:text-rose-500"
                        onClick={() =>
                          void getIde()
                            .knowledge.remove(source.id)
                            .then(() => queryClient.invalidateQueries({ queryKey: ["knowledge"] }))
                        }
                      >
                        <RiDeleteBinLine className="size-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Semantic Retriever Tester Playground */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <RiSearchLine className="size-4 text-accent-500" />
              <h3 className="text-body-medium font-semibold text-text-primary">
                Retriever Explorer & Chunks Tester
              </h3>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              Cosine vector similarity + Lexical score
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <RiSearchLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void search()
                  }}
                  placeholder="Enter query to test matching chunks..."
                  className="pl-9 bg-background-secondary-default focus-visible:bg-background-primary-default"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={rerank ? "default" : "outline"}
                  onClick={() => setRerank((value) => !value)}
                  className="gap-1 shadow-xs"
                >
                  <RiSparklingLine className="size-3.5" />
                  <span>{rerank ? "Rerank: ON" : "Rerank: OFF"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => void search()}
                  disabled={!workspaceId || !query.trim() || isSearching}
                  className="gap-1 shadow-xs"
                >
                  {isSearching ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiSearchLine className="size-4" />
                  )}
                  <span>Search</span>
                </Button>
              </div>
            </div>

            {/* Results */}
            {hasSearched ? (
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption-1-medium font-semibold text-text-secondary">
                    {hits.length > 0
                      ? `Found ${hits.length} matching chunks`
                      : "No matching chunks found"}
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    Click snippet to view in workspace
                  </span>
                </div>

                {hits.map((hit) => {
                  const matchPercent = Math.round(Math.min(100, Math.max(0, hit.score * 100)))
                  return (
                    <article
                      key={hit.chunkId}
                      className="group relative overflow-hidden rounded-xl border border-separator-border bg-background-secondary-default p-3.5 transition-all hover:border-accent-500/40 hover:bg-background-secondary-hover/40"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-separator-border/60 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            void openChangedFile(hit.path)
                            void navigate({ to: "/" })
                          }}
                          className="flex items-center gap-1.5 truncate text-left font-mono text-caption-1-medium font-semibold text-text-primary hover:text-accent-500"
                        >
                          <RiFileCodeLine className="size-3.5 text-text-tertiary" />
                          <span>
                            {hit.path}
                            {hit.startLine ? `:${hit.startLine}` : ""}
                          </span>
                          <RiArrowRightUpLine className="size-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cx(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              matchPercent >= 75
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-accent-500/10 text-accent-600 dark:text-accent-400"
                            )}
                          >
                            {matchPercent}% match
                          </span>

                          <button
                            type="button"
                            title="Copy snippet"
                            onClick={() => handleCopySnippet(hit.chunkId, hit.snippet)}
                            className="inline-flex items-center rounded-md border border-border-button-default bg-background-primary-default p-1 text-text-tertiary hover:text-text-primary shadow-xs transition-colors"
                          >
                            {copiedChunkId === hit.chunkId ? (
                              <RiCheckLine className="size-3.5 text-emerald-500" />
                            ) : (
                              <RiClipboardLine className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <pre className="mt-2.5 max-h-48 overflow-x-auto rounded-lg bg-background-primary-default p-2.5 font-mono text-[12px] leading-relaxed text-text-secondary">
                        {hit.snippet}
                      </pre>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </SecondaryPageShell>
  )
}

function SourceStatusBadge({
  status,
  stale
}: {
  status: KnowledgeSource["status"]
  stale?: boolean
}) {
  if (status === "indexing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
        <RiLoader4Line className="size-3 animate-spin" />
        Indexing
      </span>
    )
  }

  if (stale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <RiInformationLine className="size-3" />
        Stale embedding
      </span>
    )
  }

  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <RiCheckLine className="size-3" />
        Ready
      </span>
    )
  }

  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
        <RiPauseCircleLine className="size-3" />
        Paused
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
      <RiTimeLine className="size-3" />
      {status}
    </span>
  )
}

