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
import { KNOWLEDGE_PRESET_FOLDERS } from "./knowledge-constants"

interface KnowledgeFolderCardsProps {
  sources: KnowledgeSource[]
  documents: KnowledgeDocumentItem[]
  workspaceDirPaths: string[]
  indexingSourceId: string | null
  onIndexFolder: (path: string, existingSourceId?: string) => Promise<void>
  onSelectFolder: (path: string) => void
  selectedPath: string | null
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
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ root: true })

  function toggleFavorite(id: string, event: React.MouseEvent) {
    event.stopPropagation()
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="flex flex-col gap-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-body-medium font-semibold text-text-primary">
              Folders
            </h3>
            <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-600 dark:text-accent-400">
              {KNOWLEDGE_PRESET_FOLDERS.length} Collections
            </span>
          </div>
          <p className="text-caption-2-medium text-text-secondary mt-0.5">
            Organize, index, and semantically query knowledge collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption-2-medium text-text-tertiary">
            Local zero-cloud RAG
          </span>
        </div>
      </div>

      {/* Folders Grid Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {KNOWLEDGE_PRESET_FOLDERS.map((folder) => {
          const source = sources.find((s) => s.path === folder.path)
          const isIndexing = indexingSourceId === source?.id
          const isReady = source?.status === "ready"
          const isSelected = selectedPath === folder.path
          const isFavorite = !!favorites[folder.id]
          const chunkCount = source?.chunkCount ?? 0
          const matchingDocs = documents.filter(
            (d) =>
              d.sourcePath === folder.path ||
              d.path === folder.path ||
              d.path.startsWith(`${folder.path}/`)
          )
          const fileCount = matchingDocs.length || source?.documentCount || 0
          const missingOnDisk =
            folder.path !== "." && !workspaceDirPaths.includes(folder.path)
          const isError = source?.status === "error"

          return (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.path)}
              className={cx(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4.5 transition-all cursor-pointer select-none",
                isSelected
                  ? "border-accent-500 bg-background-primary-default shadow-md ring-2 ring-accent-500/20"
                  : "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              {/* Top Row: Category tag + Star button */}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {folder.category}
                </span>

                <button
                  type="button"
                  onClick={(e) => toggleFavorite(folder.id, e)}
                  title={isFavorite ? "Remove favorite" : "Add to favorites"}
                  className="rounded-lg p-1 text-text-tertiary hover:text-amber-500 transition-colors"
                >
                  {isFavorite ? (
                    <RiStarFill className="size-4 text-amber-500" />
                  ) : (
                    <RiStarLine className="size-4 group-hover:text-text-secondary" />
                  )}
                </button>
              </div>

              {/* Center Graphic: 3D/Layered stylized folder illustration */}
              <div className="my-3 flex flex-col items-center justify-center">
                <div className="relative flex size-20 items-center justify-center">
                  {/* Ambient Glow */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity"
                    style={{ background: folder.colorTheme.glow }}
                  />

                  {/* Folder Container Graphic */}
                  <div
                    className={cx(
                      "relative flex size-16 items-center justify-center rounded-2xl shadow-md transition-transform group-hover:scale-105 bg-gradient-to-br text-white",
                      folder.colorTheme.folderColor
                    )}
                  >
                    <RiFolderFill className="size-9 drop-shadow-sm" />

                    {/* Peeking Document Tab Badge */}
                    <div className="absolute -top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md bg-background-primary-default text-caption-2-medium text-text-primary shadow-xs">
                      {isReady ? "OK" : isIndexing ? "…" : "—"}
                    </div>
                  </div>
                </div>

                <h4 className="mt-2 text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors text-center">
                  {folder.name}
                </h4>

                <p className="text-[11px] text-text-tertiary text-center font-mono mt-0.5">
                  {isError
                    ? source?.error || "Path not found"
                    : isReady
                    ? `${fileCount} Files · ${chunkCount} Chunks`
                    : isIndexing
                    ? `${fileCount} files · indexing`
                    : missingOnDisk
                    ? "Not in this workspace"
                    : fileCount > 0
                    ? `${fileCount} files on disk`
                    : "Not indexed yet"}
                </p>
              </div>

              {/* Bottom Row: Status & 1-Click Action */}
              <div className="mt-2 flex items-center justify-between border-t border-separator-border/60 pt-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cx(
                      "size-2 rounded-full",
                      isReady
                        ? "bg-emerald-500"
                        : isIndexing
                        ? "bg-accent-500"
                        : "bg-text-tertiary"
                    )}
                  />
                  <span className="text-caption-2-medium text-text-secondary">
                    {isError
                      ? "Error"
                      : isReady
                      ? "Indexed"
                      : isIndexing
                      ? "Building"
                      : missingOnDisk
                      ? "Missing"
                      : "Unindexed"}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={isReady ? "ghost" : "default"}
                  disabled={isIndexing || missingOnDisk}
                  title={missingOnDisk ? "This folder is not in the open workspace" : undefined}
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
                  <span>{isReady ? "Re-index" : "Index Now"}</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
