/**
 * 资产网格页码：当前页高亮，两端省略。
 */
import { useMemo } from "react"
import { Button } from "@/components/ui/button"

export function AssetGridPager({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const pages = useMemo(() => {
    const result: (number | "ellipsis-start" | "ellipsis-end")[] = []
    if (totalPages <= 5) {
      for (let page = 1; page <= totalPages; page += 1) result.push(page)
      return result
    }
    result.push(1)
    if (currentPage > 3) result.push("ellipsis-start")
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let page = start; page <= end; page += 1) result.push(page)
    if (currentPage < totalPages - 2) result.push("ellipsis-end")
    result.push(totalPages)
    return result
  }, [currentPage, totalPages])

  return (
    <>
      {pages.map((page) =>
        typeof page === "string" ? (
          <span
            key={page}
            className="flex size-7 items-center justify-center text-caption-2-medium text-text-tertiary select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={page}
            size="icon-sm"
            variant={page === currentPage ? "default" : "outline"}
            onClick={() => onPageChange(page)}
            className="size-7 text-caption-2-medium"
          >
            {page}
          </Button>
        )
      )}
    </>
  )
}
