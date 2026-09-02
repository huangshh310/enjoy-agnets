/**
 * 可观测性链路日志专业分页组件 (Observability Traces Pagination)：
 * 严格遵循 BoardUI 语义 Token 与 IDE 数据表格规范，支持页码切换、跨度省略与每页条数选择。
 */
import { useMemo } from "react"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export interface ObservabilityPaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function ObservabilityPagination(props: ObservabilityPaginationProps) {
  const {
    currentPage,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50]
  } = props
  const t = useT()

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // 计算显示的页码数字与省略号
  const pages = useMemo(() => {
    const result: (number | "ellipsis-start" | "ellipsis-end")[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) result.push(i)
      return result
    }
    result.push(1)
    if (currentPage > 3) result.push("ellipsis-start")
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) result.push(i)
    if (currentPage < totalPages - 2) result.push("ellipsis-end")
    result.push(totalPages)
    return result
  }, [currentPage, totalPages])

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-separator-border/40 font-mono text-[11px] text-text-tertiary">
      {/* 左侧：条数信息与每页条数切换 */}
      <div className="flex items-center gap-3">
        <span>
          {t("pages.observability.showingRange", {
            start: startIndex,
            end: endIndex,
            total: totalItems
          })}
        </span>

        {onPageSizeChange ? (
          <div className="flex items-center gap-1">
            <span className="text-text-tertiary">{t("pages.observability.perPage")}</span>
            <div className="flex items-center rounded-md border border-separator-border/60 bg-background-secondary-default/50 p-0.5">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onPageSizeChange(opt)}
                  className={`rounded px-1.5 py-0.5 text-[10px] transition-all ${
                    pageSize === opt
                      ? "bg-background-primary-default font-bold text-text-primary shadow-2xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 右侧：上一页、数字页码、下一页 */}
      <div className="flex items-center gap-1 self-end sm:self-auto">
        <Button
          size="icon-sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="size-7 text-caption-2-medium"
          title={t("pages.observability.prevPage")}
        >
          <RiArrowLeftSLine className="size-3.5" />
        </Button>

        {pages.map((p, idx) =>
          typeof p === "string" ? (
            <span
              key={`${p}-${idx}`}
              className="flex size-7 items-center justify-center text-[10px] text-text-tertiary select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              size="icon-sm"
              variant={p === currentPage ? "default" : "outline"}
              onClick={() => onPageChange(p)}
              className="size-7 text-caption-2-medium"
            >
              {p}
            </Button>
          )
        )}

        <Button
          size="icon-sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="size-7 text-caption-2-medium"
          title={t("pages.observability.nextPage")}
        >
          <RiArrowRightSLine className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
