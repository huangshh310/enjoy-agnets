/**
 * 检索舞台结果：检索中 / 命中 / 最近引用 / 还不能问。
 */
import { RiFilter3Line, RiLoader4Line } from "@remixicon/react"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { KnowledgeSnippetCard } from "./knowledge-snippet-card"
import { KnowledgeWorkspaceDiscovery } from "./knowledge-workspace-discovery"

export function KnowledgeRetrievalBody({
  isSearching,
  hasSearched,
  hits,
  recent,
  focusChunkId,
  totalChunks,
  workspaceDirs = [],
  indexing = false,
  onOpenDrawer,
  onOpenAddModal,
  onIndexFolder,
  onPreviewDoc,
  onPin,
  onFilterSource
}: {
  isSearching: boolean
  hasSearched: boolean
  hits: KnowledgeHit[]
  recent: KnowledgeHit[]
  focusChunkId?: string | null
  totalChunks: number
  workspaceDirs?: string[]
  indexing?: boolean
  onOpenDrawer: () => void
  onOpenAddModal?: () => void
  onIndexFolder?: (path: string) => void
  onPreviewDoc: (path: string) => void
  onPin: (hit: KnowledgeHit) => void
  onFilterSource: (sourceId: string) => void
}) {
  const t = useT()
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-tertiary">
        <RiLoader4Line className="size-6 animate-spin text-accent-500" />
        <p className="text-caption-1-medium">{t("pages.knowledge.searchingMemory")}</p>
      </div>
    )
  }
  if (hasSearched && hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <RiFilter3Line className="size-8 text-text-tertiary opacity-60" />
        <h4 className="text-caption-1-medium text-text-primary">{t("pages.knowledge.noMatchingChunks")}</h4>
        <p className="max-w-md text-caption-2-regular text-text-tertiary">{t("pages.knowledge.emptyHitsHint")}</p>
        <Button size="sm" variant="outline" onClick={onOpenDrawer} className="mt-2 h-7.5 text-caption-2-medium">
          {t("pages.knowledge.openIndexPanel")}
        </Button>
      </div>
    )
  }
  if (hasSearched) {
    return (
      <HitList
        hits={hits}
        focusChunkId={focusChunkId}
        onPreviewDoc={onPreviewDoc}
        onPin={onPin}
        onFilterSource={onFilterSource}
      />
    )
  }
  if (totalChunks === 0) {
    return (
      <KnowledgeWorkspaceDiscovery
        workspaceDirs={workspaceDirs}
        indexing={indexing}
        onIndexFolder={(path) => onIndexFolder ? onIndexFolder(path) : onOpenDrawer()}
        onOpenAddModal={onOpenAddModal ?? onOpenDrawer}
      />
    )
  }
  if (recent.length === 0) {
    return (
      <p className="py-8 text-center text-caption-2-regular text-text-tertiary">
        {t("pages.knowledge.recentCitationsEmpty")}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <span className="px-1 text-caption-2-medium text-text-tertiary">{t("pages.knowledge.recentCitations")}</span>
      <HitList
        hits={recent}
        focusChunkId={focusChunkId}
        onPreviewDoc={onPreviewDoc}
        onPin={onPin}
        onFilterSource={onFilterSource}
      />
    </div>
  )
}

function HitList({
  hits,
  focusChunkId,
  onPreviewDoc,
  onPin,
  onFilterSource
}: {
  hits: KnowledgeHit[]
  focusChunkId?: string | null
  onPreviewDoc: (path: string) => void
  onPin: (hit: KnowledgeHit) => void
  onFilterSource: (sourceId: string) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1 text-caption-2-regular text-text-tertiary">
        <span>{t("pages.knowledge.hitCount", { n: hits.length })}</span>
        <span>{t("pages.knowledge.pinHint")}</span>
      </div>
      {hits.map((hit) => (
        <KnowledgeSnippetCard
          key={hit.chunkId}
          hit={hit}
          focused={hit.chunkId === focusChunkId}
          onPreviewDoc={onPreviewDoc}
          onPin={() => onPin(hit)}
          onFilterSource={() => onFilterSource(hit.sourceId)}
        />
      ))}
    </div>
  )
}
