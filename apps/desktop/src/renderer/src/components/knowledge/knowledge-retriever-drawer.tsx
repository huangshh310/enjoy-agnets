import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiFileTextLine,
  RiLoader4Line,
  RiSearchLine,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { SAMPLE_QUERIES } from "./knowledge-constants"

interface KnowledgeRetrieverDrawerProps {
  isOpen: boolean
  onClose: () => void
  query: string
  setQuery: (q: string) => void
  rerank: boolean
  setRerank: React.Dispatch<React.SetStateAction<boolean>>
  hits: KnowledgeHit[]
  isSearching: boolean
  hasSearched: boolean
  onSearch: () => Promise<void>
}

export function KnowledgeRetrieverDrawer({
  isOpen,
  onClose,
  query,
  setQuery,
  rerank,
  setRerank,
  hits,
  isSearching,
  hasSearched,
  onSearch
}: KnowledgeRetrieverDrawerProps) {
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)

  if (!isOpen) return null

  function handleCopySnippet(hit: KnowledgeHit) {
    void navigator.clipboard.writeText(hit.snippet)
    setCopiedSnippetId(hit.chunkId)
    setTimeout(() => setCopiedSnippetId(null), 2000)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-accent-500/30 bg-background-primary-default p-5 shadow-lg transition-all ring-1 ring-accent-500/15">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-2xs">
            <RiSearchLine className="size-4" />
          </div>
          <div>
            <h4 className="text-body-medium font-semibold text-text-primary">
              RAG Semantic Retriever & Chunks Tester
            </h4>
            <p className="text-[11px] text-text-secondary">
              Test vector similarity matches against indexed knowledge collections
            </p>
          </div>
        </div>

        <Button
          size="icon-sm"
          variant="ghost"
          title="Close tester"
          onClick={onClose}
          className="size-7"
        >
          <RiCloseLine className="size-4" />
        </Button>
      </div>

      {/* Query Bar */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearch()
              }}
              placeholder="Enter search query or keywords to test vector recall..."
              className="pl-9 bg-background-secondary-default focus-visible:bg-background-primary-default text-body-medium"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={rerank ? "default" : "outline"}
              onClick={() => setRerank((v) => !v)}
              className="gap-1 shadow-xs h-9"
            >
              <RiSparklingLine className="size-3.5" />
              <span>{rerank ? "Rerank: ON" : "Rerank: OFF"}</span>
            </Button>

            <Button
              size="sm"
              disabled={!query.trim() || isSearching}
              onClick={() => void onSearch()}
              className="gap-1.5 shadow-xs h-9 px-4"
            >
              {isSearching ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiSearchLine className="size-4" />
              )}
              <span>Search Memory</span>
            </Button>
          </div>
        </div>

        {/* Sample Queries Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-text-tertiary mr-1">Sample Queries:</span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 text-[11px] text-text-secondary hover:border-accent-500/40 hover:bg-background-secondary-hover hover:text-text-primary transition-all"
            >
              <RiSearchLine className="size-2.5 text-text-tertiary" />
              <span>{sample}</span>
            </button>
          ))}
        </div>

        {/* Search Results */}
        {hasSearched ? (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-separator-border/40 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-caption-1-medium font-semibold text-text-secondary">
                {hits.length > 0
                  ? `Found ${hits.length} matching knowledge chunks`
                  : "No matching chunks found in active sources"}
              </span>
              <span className="text-[10px] text-text-tertiary">
                Cosine Distance Score
              </span>
            </div>

            {hits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/50 p-6 text-center text-caption-1-medium text-text-secondary">
                Try indexing more sources or refining query keywords.
              </div>
            ) : (
              <div className="grid gap-2.5 max-h-96 overflow-y-auto pr-1">
                {hits.map((hit) => {
                  const scorePercent = Math.min(100, Math.round((1 - hit.score) * 100))
                  return (
                    <div
                      key={hit.chunkId}
                      className="group relative flex flex-col gap-2 rounded-xl border border-border-button-default bg-background-secondary-default/70 p-3.5 shadow-2xs hover:border-accent-500/40 hover:bg-background-primary-default transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <RiFileTextLine className="size-4 text-accent-500 shrink-0" />
                          <span className="font-mono text-caption-1-medium font-semibold text-text-primary truncate">
                            {hit.path}
                          </span>
                          {hit.startLine != null && hit.endLine != null ? (
                            <span className="rounded-md border border-border-button-default bg-background-secondary-default px-1.5 py-0.2 font-mono text-[10px] text-text-tertiary shrink-0">
                              L{hit.startLine}-L{hit.endLine}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-border-button-default overflow-hidden">
                              <div
                                className="h-full bg-accent-500 rounded-full"
                                style={{ width: `${Math.max(10, scorePercent)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-semibold text-accent-600 dark:text-accent-400">
                              {scorePercent}% match
                            </span>
                          </div>

                          <button
                            type="button"
                            title="Copy snippet"
                            onClick={() => handleCopySnippet(hit)}
                            className="rounded-lg p-1 text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors"
                          >
                            {copiedSnippetId === hit.chunkId ? (
                              <RiCheckLine className="size-3.5 text-emerald-500" />
                            ) : (
                              <RiClipboardLine className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <pre className="font-mono text-[11px] text-text-secondary leading-relaxed bg-background-primary-default/90 rounded-lg p-2.5 border border-separator-border/40 overflow-x-auto whitespace-pre-wrap">
                        {hit.snippet}
                      </pre>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
