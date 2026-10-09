/**
 * 来源集合表。View Files 必须把 selectedPath 交给父级，不能只切 tab。
 */
import { RiDeleteBinLine, RiEditLine, RiFileTextLine, RiRestartLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import {
  formatRelativeTime,
  getPathExtension,
  knowledgeSourceStatusLabel
} from "./knowledge-table-format"

type KnowledgeSourcesTableProps = {
  sources: KnowledgeSource[]
  indexingSourceId: string | null
  onViewSource: (path: string) => void
  onRebuildIndex: (sourceId: string) => Promise<void>
  onRemoveSource: (sourceId: string) => Promise<void>
  onEditSource?: (source: KnowledgeSource) => void
}

export function KnowledgeSourcesTable({
  sources,
  indexingSourceId,
  onViewSource,
  onRebuildIndex,
  onRemoveSource,
  onEditSource
}: KnowledgeSourcesTableProps) {
  const t = useT()
  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-xs">
      <table className="w-full text-left text-caption-1-medium">
        <thead className="border-b border-separator-border/60 bg-background-secondary-default/60 text-text-tertiary">
          <tr>
            <th className="px-4 py-3">{t("pages.knowledge.colCollectionPath")}</th>
            <th className="px-4 py-3">{t("pages.knowledge.colChunksFiles")}</th>
            <th className="px-4 py-3">{t("pages.knowledge.colStatus")}</th>
            <th className="px-4 py-3 text-right">{t("pages.knowledge.colActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-separator-border/40">
          {sources.map((source) => {
            const isIndexing = indexingSourceId === source.id || source.status === "indexing"
            const ext = getPathExtension(source.path)
            return (
              <tr
                key={source.id}
                onClick={() => onViewSource(source.path)}
                className="cursor-pointer hover:bg-background-secondary-hover/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 font-mono text-caption-2-medium text-accent-500">
                      {ext?.toUpperCase() ?? t("pages.knowledge.dirFallback")}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-caption-1-medium text-text-primary">
                        {source.path === "." ? t("pages.knowledge.workspaceRootDot") : source.path}
                      </div>
                      <span className="font-mono text-caption-2-medium text-text-tertiary">
                        {source.kind === "directory"
                          ? t("pages.knowledge.directoryTree")
                          : t("pages.knowledge.singleFile")}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-caption-2-medium text-text-primary">
                  {t("pages.knowledge.chunksFilesCount", {
                    chunks: source.chunkCount,
                    files: source.documentCount
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "size-2 shrink-0 rounded-full",
                        source.status === "ready"
                          ? "bg-accent-500"
                          : isIndexing
                            ? "bg-accent-500/60"
                            : "bg-text-tertiary"
                      )}
                    />
                    <div>
                      <div className="text-caption-1-medium text-text-primary">
                        {knowledgeSourceStatusLabel(t, source.status, isIndexing)}
                      </div>
                      <div
                        className={cx(
                          "max-w-[220px] truncate text-caption-2-medium",
                          source.error ? "text-status-yellow-text dark:text-status-yellow-text font-medium" : "text-text-tertiary"
                        )}
                        title={source.error || undefined}
                      >
                        {source.error ? t("pages.knowledge.statusError") : formatRelativeTime(source.updatedAt, t)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewSource(source.path)}
                      className="h-7 gap-1"
                    >
                      <RiFileTextLine className="size-3 text-accent-500" />
                      {t("pages.knowledge.viewFiles")}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={t("pages.knowledge.reindexSource")}
                      onClick={() => void onRebuildIndex(source.id)}
                    >
                      <RiRestartLine className={cx("size-3.5", isIndexing && "animate-spin")} />
                    </Button>
                    {onEditSource ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={t("pages.knowledge.editSourcePath")}
                        onClick={() => onEditSource(source)}
                      >
                        <RiEditLine className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={isIndexing}
                      title={t("pages.knowledge.removeSource")}
                      onClick={() => void onRemoveSource(source.id)}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
