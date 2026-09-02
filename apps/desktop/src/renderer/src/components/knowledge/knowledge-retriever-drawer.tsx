import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiFileTextLine,
  RiLoader4Line,
  RiPushpinLine,
  RiSearchLine,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { addSessionContextChip } from "@renderer/hooks/session-context-chips"
import { useT } from "@renderer/i18n"
import { getSampleQueries } from "./knowledge-constants"
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
  const t = useT()
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [pinnedSnippetId, setPinnedSnippetId] = useState<string | null>(null)

  if (!isOpen) return null

  function handleCopySnippet(hit: KnowledgeHit) {
    void navigator.clipboard.writeText(hit.snippet)
    setCopiedSnippetId(hit.chunkId)
    setTimeout(() => setCopiedSnippetId(null), 1500)
  }

  function handlePinToChat(hit: KnowledgeHit) {
    const parts = hit.path.replaceAll("\\", "/").split("/")
    addSessionContextChip({
      id: hit.chunkId,
      kind: "knowledge",
      label: parts.at(-1) || hit.path,
      path: hit.path,
      snippet: hit.snippet
    })
    setPinnedSnippetId(hit.chunkId)
    setTimeout(() => setPinnedSnippetId(null), 2000)
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
              {t("pages.knowledge.retrieverTitle")}
            </h4>
            <p className="text-[11px] text-text-secondary">
              {t("pages.knowledge.retrieverDesc")}
            </p>
          </div>
        </div>

        <Button
          size="icon-sm"
          variant="ghost"
          title={t("pages.knowledge.closeTester")}
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
              placeholder={t("pages.knowledge.retrieverPlaceholder")}
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
              <span>{rerank ? t("pages.knowledge.rerankOn") : t("pages.knowledge.rerankOff")}</span>
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
              <span>{t("pages.knowledge.searchMemory")}</span>
            </Button>
          </div>
        </div>

        {/* Sample Queries Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-text-tertiary mr-1">{t("pages.knowledge.sampleQueries")}</span>
          {getSampleQueries(t).map((sample) => (
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
                  ? t("pages.knowledge.foundChunks", { n: hits.length })
                  : t("pages.knowledge.noMatchingChunks")}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {t("pages.knowledge.cosineScore")}
              </span>
            </div>

            {hits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/50 p-6 text-center text-caption-1-medium text-text-secondary">
                {t("pages.knowledge.emptyHitsHint")}
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
                            <span className="font-mono text-caption-2-medium font-semibold text-accent-500">
                              {t("pages.knowledge.matchPercent", { n: scorePercent })}
                            </span>
                          </div>
                          <button
                            type="button"
                            title={pinnedSnippetId === hit.chunkId ? t("pages.knowledge.pinnedToChat") : t("pages.knowledge.pinToChat")}
                            onClick={() => handlePinToChat(hit)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-500 hover:bg-accent-500/20"
                          >
                            <RiPushpinLine className="size-3" />
                            <span>{pinnedSnippetId === hit.chunkId ? t("pages.knowledge.pinnedToChat") : t("pages.knowledge.pinToChat")}</span>
                          </button>

                          <button
                            type="button"
                            title={t("pages.knowledge.copySnippet")}
                            onClick={() => handleCopySnippet(hit)}
                            className="rounded-lg p-1 text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors cursor-pointer"
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
