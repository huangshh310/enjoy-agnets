/**
 * 已扫到 / 已入库的文档表与网格。点行打开预览。
 */
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiEyeLine,
  RiFileTextLine,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { KnowledgeDocumentItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getPathExtension } from "./knowledge-table-format"

type KnowledgeDocumentListProps = {
  documents: KnowledgeDocumentItem[]
  viewMode: "table" | "grid"
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onPreviewDocument?: (doc: KnowledgeDocumentItem) => void
  onQuickSearchSource?: (sourcePath: string) => void
}

export function KnowledgeDocumentList({
  documents,
  viewMode,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onPreviewDocument,
  onQuickSearchSource
}: KnowledgeDocumentListProps) {
  const t = useT()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (viewMode === "grid") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const ext = getPathExtension(doc.path)
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onPreviewDocument?.(doc)}
              className="group flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-4 text-left shadow-xs hover:border-accent-500/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 font-mono text-caption-2-medium text-accent-500">
                  {ext?.toUpperCase() ?? t("pages.knowledge.fileFallback")}
                </span>
                <div className="min-w-0">
                  <h5 className="truncate text-caption-1-medium text-text-primary group-hover:text-accent-500">
                    {doc.path}
                  </h5>
                  <span className="font-mono text-caption-2-medium text-text-tertiary">
                    {doc.sourcePath}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-caption-2-medium text-text-secondary">
                <span>{t("pages.knowledge.chunksCount", { n: doc.chunkCount })}</span>
                <span className="flex items-center gap-1 text-accent-500">
                  <RiEyeLine className="size-3" /> {t("pages.knowledge.preview")}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-xs">
      <table className="w-full text-left text-caption-1-medium">
        <thead className="border-b border-separator-border/60 bg-background-secondary-default/60 text-text-tertiary">
          <tr>
            <th className="px-4 py-3">{t("pages.knowledge.colDocumentPath")}</th>
            <th className="px-4 py-3">{t("pages.knowledge.colParentCollection")}</th>
            <th className="px-4 py-3">{t("pages.knowledge.colVectorChunks")}</th>
            <th className="px-4 py-3">{t("pages.knowledge.colStatus")}</th>
            <th className="px-4 py-3 text-right">{t("pages.knowledge.colActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-separator-border/40">
          {documents.map((doc) => {
            const ext = getPathExtension(doc.path)
            return (
              <tr
                key={doc.id}
                onClick={() => onPreviewDocument?.(doc)}
                className="cursor-pointer hover:bg-background-secondary-hover/50"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 font-mono text-caption-2-medium text-accent-500">
                      {ext?.toUpperCase() ?? t("pages.knowledge.fileFallback")}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-caption-1-medium text-text-primary">
                        {doc.path}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-secondary">
                    {doc.sourcePath === "." ? t("pages.knowledge.workspaceRoot") : doc.sourcePath}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-caption-2-medium text-text-primary">
                  {t("pages.knowledge.chunksCount", { n: doc.chunkCount })}
                </td>
                <td className="px-4 py-2.5 capitalize text-caption-2-medium text-text-secondary">
                  {doc.status}
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={t("pages.knowledge.previewFile")}
                      onClick={() => onPreviewDocument?.(doc)}
                    >
                      <RiEyeLine className="size-3.5" />
                    </Button>
                    {onQuickSearchSource ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={t("pages.knowledge.searchChunksInFile")}
                        onClick={() => onQuickSearchSource(doc.path)}
                      >
                        <RiSearchLine className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-separator-border/60 bg-background-secondary-default/40 px-4 py-2.5 text-caption-2-medium text-text-secondary">
          <div className="flex items-center gap-3">
            <span>
              {t("pages.knowledge.showingRange", {
                start: (page - 1) * pageSize + 1,
                end: Math.min(total, page * pageSize),
                total
              })}
            </span>
            <div className="flex items-center gap-1">
              {[15, 30, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onPageSizeChange(size)}
                  className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-caption-2-medium",
                    pageSize === size
                      ? "bg-accent-500/15 text-accent-500"
                      : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {t("pages.knowledge.perPage", { size })}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <RiArrowLeftSLine className="size-4" />
            </Button>
            <span className="px-2 font-mono">
              {page} / {totalPages}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              <RiArrowRightSLine className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function KnowledgeDocumentsEmpty({
  loading,
  error
}: {
  loading?: boolean
  error?: string | null
}) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/40 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500">
        <RiFileTextLine className="size-7" />
      </div>
      <h4 className="mt-3.5 text-body-medium text-text-primary">
        {loading
          ? t("pages.knowledge.scanningFiles")
          : error
            ? t("pages.knowledge.couldNotList")
            : t("pages.knowledge.noFilesInCollection")}
      </h4>
      <p className="mt-1 max-w-md text-caption-1-medium text-text-secondary">
        {error ?? t("pages.knowledge.emptyHint")}
      </p>
    </div>
  )
}
