/**
 * 知识文件矩阵：文档 tab 与来源 tab。过滤逻辑在 knowledge-document-filters。
 */
import { useMemo, useState } from "react"
import {
  RiArrowUpDownLine,
  RiFileTextLine,
  RiFolder6Line,
  RiLayoutGridLine,
  RiListUnordered,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getSupportedFileFormats } from "./knowledge-constants"
import { filterKnowledgeDocuments, filterKnowledgeSources } from "./knowledge-document-filters"
import { KnowledgeDocumentList, KnowledgeDocumentsEmpty } from "./knowledge-document-list"
import { KnowledgeSourcesTable } from "./knowledge-sources-table"
import { sortByKnowledgeField } from "./knowledge-table-format"
import type {
  KnowledgeDocumentsTableProps,
  KnowledgeSortField,
  KnowledgeTabMode,
  KnowledgeViewMode
} from "./knowledge-table.types"

export function KnowledgeDocumentsTable({
  sources,
  documents,
  indexingSourceId,
  selectedPath,
  documentsLoading,
  documentsError,
  onRebuildIndex,
  onRemoveSource,
  onEditSource,
  onPreviewDocument,
  onQuickSearchSource,
  onViewSource
}: KnowledgeDocumentsTableProps) {
  const t = useT()
  const [tabMode, setTabMode] = useState<KnowledgeTabMode>("documents")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [sortField, setSortField] = useState<KnowledgeSortField>("updated")
  const [viewMode, setViewMode] = useState<KnowledgeViewMode>("table")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const filteredSources = useMemo(
    () =>
      sortByKnowledgeField(
        filterKnowledgeSources(sources, { selectedPath, searchQuery }),
        sortField
      ),
    [sources, selectedPath, searchQuery, sortField]
  )

  const filteredDocuments = useMemo(
    () =>
      sortByKnowledgeField(
        filterKnowledgeDocuments(documents, { selectedPath, selectedFormat, searchQuery }),
        sortField
      ),
    [documents, selectedPath, selectedFormat, searchQuery, sortField]
  )

  const paginatedDocs = filteredDocuments.slice((page - 1) * pageSize, page * pageSize)

  function openSourceFiles(path: string) {
    onViewSource?.(path)
    setTabMode("documents")
    setPage(1)
  }

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-0.5">
          <TabButton
            active={tabMode === "documents"}
            icon={RiFileTextLine}
            label={t("pages.knowledge.allIndexedFiles")}
            count={filteredDocuments.length}
            onClick={() => {
              setTabMode("documents")
              setPage(1)
            }}
          />
          <TabButton
            active={tabMode === "sources"}
            icon={RiFolder6Line}
            label={t("pages.knowledge.collections")}
            count={filteredSources.length}
            onClick={() => {
              setTabMode("sources")
              setPage(1)
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44 sm:w-56">
            <RiSearchLine className="absolute left-2.5 top-2 size-3.5 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setPage(1)
              }}
              placeholder={t("pages.knowledge.searchFilePath")}
              className="h-8 bg-background-secondary-default pl-8 text-caption-1-medium"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5">
                <RiArrowUpDownLine className="size-3.5 text-text-tertiary" />
                {sortField === "updated"
                  ? t("pages.knowledge.sortUpdated")
                  : sortField === "name"
                    ? t("pages.knowledge.sortName")
                    : t("pages.knowledge.sortChunks")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortField("updated")}>
                {t("pages.knowledge.sortUpdated")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField("name")}>{t("pages.knowledge.sortName")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField("chunks")}>
                {t("pages.knowledge.sortChunks")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-0.5">
            <button
              type="button"
              title={t("pages.knowledge.tableView")}
              onClick={() => setViewMode("table")}
              className={cx(
                "rounded-lg p-1.5",
                viewMode === "table" ? "bg-background-primary-default text-text-primary" : "text-text-tertiary"
              )}
            >
              <RiListUnordered className="size-3.5" />
            </button>
            <button
              type="button"
              title={t("pages.knowledge.gridView")}
              onClick={() => setViewMode("grid")}
              className={cx(
                "rounded-lg p-1.5",
                viewMode === "grid" ? "bg-background-primary-default text-text-primary" : "text-text-tertiary"
              )}
            >
              <RiLayoutGridLine className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {tabMode === "documents" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <FormatChip
            label={t("pages.knowledge.allFormats", { n: documents.length })}
            active={selectedFormat === null}
            onClick={() => {
              setSelectedFormat(null)
              setPage(1)
            }}
          />
          {getSupportedFileFormats(t).map((format) => {
            const count = documents.filter((doc) => doc.path.endsWith(format.ext)).length
            if (count === 0 && documents.length > 0) return null
            return (
              <FormatChip
                key={format.ext}
                label={`${format.ext} (${count})`}
                active={selectedFormat === format.ext}
                onClick={() => {
                  setSelectedFormat((cur) => (cur === format.ext ? null : format.ext))
                  setPage(1)
                }}
              />
            )
          })}
        </div>
      ) : null}

      {tabMode === "documents" ? (
        filteredDocuments.length === 0 ? (
          <KnowledgeDocumentsEmpty loading={documentsLoading} error={documentsError} />
        ) : (
          <KnowledgeDocumentList
            documents={paginatedDocs}
            viewMode={viewMode}
            page={page}
            pageSize={pageSize}
            total={filteredDocuments.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            onPreviewDocument={onPreviewDocument}
            onQuickSearchSource={onQuickSearchSource}
          />
        )
      ) : (
        <KnowledgeSourcesTable
          sources={filteredSources}
          indexingSourceId={indexingSourceId}
          onViewSource={openSourceFiles}
          onRebuildIndex={onRebuildIndex}
          onRemoveSource={onRemoveSource}
          onEditSource={onEditSource}
        />
      )}
    </section>
  )
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick
}: {
  active: boolean
  icon: typeof RiFileTextLine
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-lg px-3 py-1 text-caption-1-medium",
        active ? "bg-background-primary-default text-text-primary shadow-xs" : "text-text-tertiary"
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
      <span className="rounded-full bg-accent-500/10 px-1.5 text-caption-2-medium text-accent-500">
        {count}
      </span>
    </button>
  )
}

function FormatChip({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg border px-2 py-0.5 text-caption-2-medium",
        active
          ? "border-accent-500 bg-accent-500/10 text-accent-500"
          : "border-border-button-default bg-background-secondary-default text-text-tertiary"
      )}
    >
      {label}
    </button>
  )
}
