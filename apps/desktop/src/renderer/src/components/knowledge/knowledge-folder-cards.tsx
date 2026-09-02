import { useState } from "react"
import {
  RiAddLine,
  RiFolderFill,
  RiRestartLine,
  RiStarFill,
  RiStarLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { KnowledgeDocumentItem, KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"
import { getKnowledgePresetFolders, type KnowledgePresetFolder } from "./knowledge-constants"

interface KnowledgeFolderCardsProps {
  sources: KnowledgeSource[]
  documents: KnowledgeDocumentItem[]
  workspaceDirPaths: string[]
  indexingSourceId: string | null
  onIndexFolder: (path: string, existingSourceId?: string) => Promise<void>
  onSelectFolder: (path: string) => void
  selectedPath: string | null
}

function folderMetaLine(
  t: TranslateFn,
  state: {
    isError: boolean
    error?: string
    isReady: boolean
    isIndexing: boolean
    missingOnDisk: boolean
    fileCount: number
    chunkCount: number
  }
): string {
  if (state.isError) return state.error || t("pages.knowledge.pathNotFound")
  if (state.isReady) {
    return t("pages.knowledge.filesChunks", { fileCount: state.fileCount, chunkCount: state.chunkCount })
  }
  if (state.isIndexing) return t("pages.knowledge.filesIndexing", { fileCount: state.fileCount })
  if (state.missingOnDisk) return t("pages.knowledge.notInWorkspace")
  if (state.fileCount > 0) return t("pages.knowledge.filesOnDisk", { fileCount: state.fileCount })
  return t("pages.knowledge.notIndexedYet")
}

function folderStatusLabel(
  t: TranslateFn,
  isError: boolean,
  isReady: boolean,
  isIndexing: boolean,
  missingOnDisk: boolean
): string {
  if (isError) return t("pages.knowledge.statusError")
  if (isReady) return t("pages.knowledge.statusIndexed")
  if (isIndexing) return t("pages.knowledge.statusBuilding")
  if (missingOnDisk) return t("pages.knowledge.statusMissing")
  return t("pages.knowledge.statusUnindexed")
}

export function KnowledgeFolderCards({
  sources,
  documents,
  workspaceDirPaths,
  indexingSourceId,
  onIndexFolder,
  onSelectFolder,
  selectedPath
}: KnowledgeFolderCardsProps) {
  const t = useT()
  const folders = getKnowledgePresetFolders(t)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ root: true })

  function toggleFavorite(id: string, event: React.MouseEvent) {
    event.stopPropagation()
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-body-medium font-semibold text-text-primary">
              {t("pages.knowledge.folders")}
            </h3>
            <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-600 dark:text-accent-400">
              {t("pages.knowledge.collectionsCount", { n: folders.length })}
            </span>
          </div>
          <p className="text-caption-2-medium text-text-secondary mt-0.5">
            {t("pages.knowledge.foldersHint")}
          </p>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">
          {t("pages.knowledge.localRag")}
        </span>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {folders.map((folder) => (
          <KnowledgeFolderCard
            key={folder.id}
            folder={folder}
            source={sources.find((s) => s.path === folder.path)}
            documents={documents}
            workspaceDirPaths={workspaceDirPaths}
            indexingSourceId={indexingSourceId}
            selectedPath={selectedPath}
            isFavorite={!!favorites[folder.id]}
            onToggleFavorite={toggleFavorite}
            onSelectFolder={onSelectFolder}
            onIndexFolder={onIndexFolder}
          />
        ))}
      </div>
    </section>
  )
}

function KnowledgeFolderCard({
  folder,
  source,
  documents,
  workspaceDirPaths,
  indexingSourceId,
  selectedPath,
  isFavorite,
  onToggleFavorite,
  onSelectFolder,
  onIndexFolder
}: {
  folder: KnowledgePresetFolder
  source: KnowledgeSource | undefined
  documents: KnowledgeDocumentItem[]
  workspaceDirPaths: string[]
  indexingSourceId: string | null
  selectedPath: string | null
  isFavorite: boolean
  onToggleFavorite: (id: string, event: React.MouseEvent) => void
  onSelectFolder: (path: string) => void
  onIndexFolder: (path: string, existingSourceId?: string) => Promise<void>
}) {
  const t = useT()
  const isIndexing = indexingSourceId === source?.id
  const isReady = source?.status === "ready"
  const isSelected = selectedPath === folder.path
  const chunkCount = source?.chunkCount ?? 0
  const matchingDocs = documents.filter(
    (d) =>
      d.sourcePath === folder.path ||
      d.path === folder.path ||
      d.path.startsWith(`${folder.path}/`)
  )
  const fileCount = matchingDocs.length || source?.documentCount || 0
  const missingOnDisk = folder.path !== "." && !workspaceDirPaths.includes(folder.path)
  const isError = source?.status === "error"

  return (
    <div
      onClick={() => onSelectFolder(folder.path)}
      className={cx(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4.5 transition-all cursor-pointer select-none",
        isSelected
          ? "border-accent-500 bg-background-primary-default shadow-md ring-2 ring-accent-500/20"
          : "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {folder.category}
        </span>
        <button
          type="button"
          onClick={(e) => onToggleFavorite(folder.id, e)}
          title={isFavorite ? t("pages.knowledge.removeFavorite") : t("pages.knowledge.addFavorite")}
          className="rounded-lg p-1 text-text-tertiary hover:text-amber-500 transition-colors"
        >
          {isFavorite ? (
            <RiStarFill className="size-4 text-amber-500" />
          ) : (
            <RiStarLine className="size-4 group-hover:text-text-secondary" />
          )}
        </button>
      </div>

      <div className="my-3 flex flex-col items-center justify-center">
        <div className="relative flex size-20 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity"
            style={{ background: folder.colorTheme.glow }}
          />
          <div
            className={cx(
              "relative flex size-16 items-center justify-center rounded-2xl shadow-md transition-transform group-hover:scale-105 bg-gradient-to-br text-white",
              folder.colorTheme.folderColor
            )}
          >
            <RiFolderFill className="size-9 drop-shadow-sm" />
            <div className="absolute -top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md bg-background-primary-default text-caption-2-medium text-text-primary shadow-xs">
              {isReady ? t("pages.knowledge.badgeOk") : isIndexing ? "…" : "—"}
            </div>
          </div>
        </div>
        <h4 className="mt-2 text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors text-center">
          {folder.name}
        </h4>
        <p className="text-[11px] text-text-tertiary text-center font-mono mt-0.5">
          {folderMetaLine(t, {
            isError,
            error: source?.error,
            isReady,
            isIndexing,
            missingOnDisk,
            fileCount,
            chunkCount
          })}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-separator-border/60 pt-3">
        <div className="flex items-center gap-1.5">
          <span
            className={cx(
              "size-2 rounded-full",
              isReady ? "bg-emerald-500" : isIndexing ? "bg-accent-500" : "bg-text-tertiary"
            )}
          />
          <span className="text-caption-2-medium text-text-secondary">
            {folderStatusLabel(t, isError, isReady, isIndexing, missingOnDisk)}
          </span>
        </div>
        <Button
          size="sm"
          variant={isReady ? "ghost" : "default"}
          disabled={isIndexing || missingOnDisk}
          title={missingOnDisk ? t("pages.knowledge.missingFolderHint") : undefined}
          onClick={(e) => {
            e.stopPropagation()
            void onIndexFolder(folder.path, source?.id)
          }}
          className="gap-1 h-7 px-2.5 text-[11px] shadow-xs"
        >
          {isIndexing ? (
            <span className="size-3 rounded-full bg-accent-500/40" aria-hidden />
          ) : isReady ? (
            <RiRestartLine className="size-3" />
          ) : (
            <RiAddLine className="size-3" />
          )}
          <span>{isReady ? t("pages.knowledge.reindex") : t("pages.knowledge.indexNow")}</span>
        </Button>
      </div>
    </div>
  )
}
