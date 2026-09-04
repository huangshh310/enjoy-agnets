/**
 * 快速跳转到文件弹窗组件：
 * 对齐 Codex Image #7 设计规范，支持通过快捷键或顶栏按钮呼出，提供快速模糊检索、目录高亮与即时定位。
 */

import { useState, useMemo } from "react"
import { RiFileCodeLine, RiSearchLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { splitReviewPath } from "../path-label"
import { STATUS_CONFIG } from "../constants/review-constants"

export function ReviewJumpPalette(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  changes: ChangedFileRow[]
  onSelectFile: (path: string) => void
}) {
  const { open, onOpenChange, changes, onSelectFile } = props
  const t = useT()
  const [query, setQuery] = useState("")

  const filteredChanges = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return changes
    return changes.filter((file) => file.path.toLowerCase().includes(q))
  }, [changes, query])

  function handleSelect(path: string) {
    onSelectFile(path)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-separator-border shadow-card bg-background-primary-default sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("chat.reviewJumpToFile")}</DialogTitle>
        </DialogHeader>

        {/* 顶部搜索框 */}
        <div className="flex items-center gap-2 border-b border-separator-border px-3.5 py-2.5">
          <RiSearchLine className="size-4 shrink-0 text-text-tertiary" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chat.reviewJumpPlaceholder")}
            className="w-full bg-transparent text-body-medium text-text-primary placeholder:text-text-tertiary focus:outline-hidden"
          />
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 min-h-36 overflow-y-auto p-1.5">
          {filteredChanges.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-caption-1-medium text-text-tertiary">
              {t("chat.reviewNoMatchingFiles")}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filteredChanges.map((file) => {
                const { dir, name } = splitReviewPath(file.path)
                const status = STATUS_CONFIG[file.status]
                return (
                  <li key={file.path}>
                    <button
                      type="button"
                      onClick={() => handleSelect(file.path)}
                      className="group flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-background-secondary-hover cursor-pointer transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <RiFileCodeLine className="size-4 shrink-0 text-accent-500" />
                        <span className="truncate text-caption-1-medium font-medium text-text-primary group-hover:text-accent-500">
                          {name}
                        </span>
                        {dir ? (
                          <span className="truncate font-mono text-[11px] text-text-tertiary">
                            {dir}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center rounded px-1 text-[10px] font-mono font-bold border ${status.bgTone}`}
                        >
                          {status.mark}
                        </span>
                        <span className="font-mono text-caption-2-medium text-state-success-text">
                          +{file.additions}
                        </span>
                        <span className="font-mono text-caption-2-medium text-text-error-primary">
                          -{file.deletions}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
