/**
 * 来源集合表。View Files 必须把 selectedPath 交给父级，不能只切 tab。
 */
import { RiDeleteBinLine, RiEditLine, RiFileTextLine, RiRestartLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { formatRelativeTime, getPathExtension } from "./knowledge-table-format"

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
  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-xs">
      <table className="w-full text-left text-caption-1-medium">
        <thead className="border-b border-separator-border/60 bg-background-secondary-default/60 text-text-tertiary">
          <tr>
            <th className="px-4 py-3">Collection & Path</th>
            <th className="px-4 py-3">Chunks & Files</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-separator-border/40">
          {sources.map((source) => {
            const isIndexing =
              indexingSourceId === source.id || source.status === "indexing"
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
                      {ext?.toUpperCase() ?? "DIR"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-caption-1-medium text-text-primary">
                        {source.path === "." ? "Workspace Root (.)" : source.path}
                      </div>
                      <span className="font-mono text-caption-2-medium text-text-tertiary">
                        {source.kind === "directory" ? "Directory tree" : "Single file"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-caption-2-medium text-text-primary">
                  {source.chunkCount} Chunks ({source.documentCount} files)
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
                      <div className="capitalize text-caption-1-medium text-text-primary">
                        {isIndexing ? "Indexing" : source.status}
                      </div>
                      <div className="max-w-[220px] truncate text-caption-2-medium text-text-tertiary">
                        {source.error || formatRelativeTime(source.updatedAt)}
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
                      View Files
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={isIndexing}
                      title="Re-index this source"
                      onClick={() => void onRebuildIndex(source.id)}
                    >
                      <RiRestartLine className="size-3.5" />
                    </Button>
                    {onEditSource ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit source path"
                        onClick={() => onEditSource(source)}
                      >
                        <RiEditLine className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={isIndexing}
                      title="Remove source"
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
