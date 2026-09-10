/**
 * 知识库检索舞台：常驻首屏，回车即搜。
 */
import { RiSearchLine } from "@remixicon/react"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { KnowledgeRetrievalBody } from "./knowledge-retrieval-body"
import { KnowledgeRetrievalQueryBar } from "./knowledge-retrieval-query-bar"

export function KnowledgeRetrievalStage({
  query,
  setQuery,
  rerank,
  setRerank,
  hits,
  recent,
  focusChunkId,
  isSearching,
  hasSearched,
  totalChunks,
  activeLensName,
  workspaceDirs = [],
  indexing = false,
  onSearch,
  onOpenDrawer,
  onOpenAddModal,
  onIndexFolder,
  onPreviewDoc,
  onClearLensFilter,
  onPin,
  onFilterSource
}: {
  query: string
  setQuery: (q: string) => void
  rerank: boolean
  setRerank: (fn: (prev: boolean) => boolean) => void
  hits: KnowledgeHit[]
  recent: KnowledgeHit[]
  focusChunkId?: string | null
  isSearching: boolean
  hasSearched: boolean
  totalChunks: number
  activeLensName?: string | null
  workspaceDirs?: string[]
  indexing?: boolean
  onSearch: () => Promise<void>
  onOpenDrawer: () => void
  onOpenAddModal?: () => void
  onIndexFolder?: (path: string) => void
  onPreviewDoc: (path: string) => void
  onClearLensFilter: () => void
  onPin: (hit: KnowledgeHit) => void
  onFilterSource: (sourceId: string) => void
}) {
  const t = useT()
  return (
    <section className="relative flex min-h-[300px] flex-col gap-4 overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <RiSearchLine className="size-4" />
          </div>
          <h3 className="text-title-3-semibold text-text-primary">{t("pages.knowledge.searchMemory")}</h3>
        </div>
        {activeLensName ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium text-accent-700 dark:text-accent-300">
            <span>{t("pages.knowledge.currentLens", { name: activeLensName })}</span>
            <button type="button" onClick={onClearLensFilter} className="cursor-pointer hover:text-text-primary">
              ×
            </button>
          </div>
        ) : (
          <span className="text-caption-2-regular text-text-tertiary">
            {t("pages.knowledge.scopeAllReady", { n: totalChunks })}
          </span>
        )}
      </div>
      <KnowledgeRetrievalQueryBar
        query={query}
        setQuery={setQuery}
        rerank={rerank}
        setRerank={setRerank}
        isSearching={isSearching}
        onSearch={() => void onSearch()}
      />
      <div className="flex min-h-[160px] flex-col gap-3 border-t border-separator-border/40 pt-2">
        <KnowledgeRetrievalBody
          isSearching={isSearching}
          hasSearched={hasSearched}
          hits={hits}
          recent={recent}
          focusChunkId={focusChunkId}
          totalChunks={totalChunks}
          workspaceDirs={workspaceDirs}
          indexing={indexing}
          onOpenDrawer={onOpenDrawer}
          onOpenAddModal={onOpenAddModal}
          onIndexFolder={onIndexFolder}
          onPreviewDoc={onPreviewDoc}
          onPin={onPin}
          onFilterSource={onFilterSource}
        />
      </div>
    </section>
  )
}
