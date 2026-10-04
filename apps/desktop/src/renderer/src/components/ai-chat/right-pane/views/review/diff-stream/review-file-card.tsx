/**
 * 独立文件 Diff 卡片组件：
 * 对齐 Codex Image #1 & #6 中的文件差异卡片规范：
 * - 粘性标头：类型徽标 (TS/JS/CSS)、缩略路径、增减行统计 (+32 -0)
 * - 交互操作：复制路径、复制 Diff、折叠/展开当前卡片
 * - 主体内容：惰性加载并渲染高精度的 FileDiff 行网格
 */

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiFileCopyLine,
  RiFileCodeLine
} from "@remixicon/react"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { FileDiffResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import type { DiffPalette } from "../../../../diff/diff-palette"
import { FileDiff } from "../../../../diff/file-diff"
import { splitReviewPath } from "../path-label"
import type { ReviewOptions } from "../types/review.types"
import { STATUS_CONFIG } from "../constants/review-constants"
import type { ChangedFileRow } from "@renderer/stores/chat-store"

export function ReviewFileCard(props: {
  workspaceId: string
  file: ChangedFileRow
  options: ReviewOptions
  palette?: DiffPalette
  isExpanded: boolean
  onToggleExpand: () => void
  onSelectFile: (path: string) => void
  isSelected: boolean
}) {
  const {
    workspaceId,
    file,
    options,
    palette = "default",
    isExpanded,
    onToggleExpand,
    onSelectFile,
    isSelected
  } = props

  const [copiedPath, setCopiedPath] = useState(false)
  const { dir, name } = splitReviewPath(file.path)
  const statusConfig = STATUS_CONFIG[file.status]

  // 惰性加载对应文件的 Unified Diff
  const diffQuery = useQuery({
    queryKey: ["workspace-diff", workspaceId, file.path, options.hideWhitespace],
    queryFn: () =>
      getIde().workspace.diff({
        workspaceId,
        path: file.path,
        ignoreWhitespace: options.hideWhitespace
      }) as Promise<FileDiffResult>,
    enabled: Boolean(workspaceId && file.path && isExpanded)
  })

  function handleCopyPath(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(file.path)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 1500)
  }

  const diffModel = useMemo(
    () =>
      diffQuery.data?.diff ? parseUnifiedDiff(diffQuery.data.diff, file.path) : null,
    [diffQuery.data?.diff, file.path]
  )

  return (
    <article
      id={`diff-card-${encodeURIComponent(file.path)}`}
      className={`flex shrink-0 flex-col overflow-hidden rounded-xl border bg-background-primary-default ${
        isSelected
          ? "border-accent-500/70 shadow-sm"
          : "border-separator-border/80 hover:border-separator-border"
      }`}
    >
      {/* 粘性卡片标头 (Sticky Header) */}
      <header
        onClick={() => onSelectFile(file.path)}
        className="sticky top-0 z-10 flex h-9 items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/90 px-3 text-caption-2-medium cursor-pointer select-none"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="cursor-pointer text-text-tertiary hover:text-text-primary p-0.5"
          >
            {isExpanded ? (
              <RiArrowDownSLine className="size-3.5" />
            ) : (
              <RiArrowRightSLine className="size-3.5" />
            )}
          </button>

          <RiFileCodeLine className="size-3.5 shrink-0 text-accent-500" />

          {/* 路径展示 */}
          <div className="flex min-w-0 items-center font-mono text-caption-2-regular">
            {dir ? (
              <span className="truncate text-text-tertiary max-w-[180px]">
                {dir}/
              </span>
            ) : null}
            <span className="font-semibold text-text-primary">{name}</span>
          </div>

          {/* Git 状态字母 */}
          <span
            className={`inline-flex items-center justify-center rounded px-1 text-caption-2-bold font-mono font-bold border ${statusConfig.bgTone}`}
          >
            {statusConfig.mark}
          </span>
        </div>

        {/* 右侧统计与复制 */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-caption-2-regular">
            <span className="text-state-success-text">+{file.additions}</span>
            <span className="text-text-error-primary">-{file.deletions}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyPath}
            title="复制文件相对路径"
            className="cursor-pointer rounded p-1 text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
          >
            {copiedPath ? (
              <RiCheckLine className="size-3.5 text-state-success-text" />
            ) : (
              <RiFileCopyLine className="size-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* 卡片 Diff 主体 */}
      {isExpanded ? (
        <div className="shrink-0">
          {diffQuery.isPending ? (
            <div className="flex h-24 items-center justify-center font-mono text-caption-2-medium text-text-tertiary">
              加载文件差异中…
            </div>
          ) : diffModel && diffModel.hunks.length > 0 ? (
            <FileDiff
              model={diffModel}
              embedded
              hideHeader
              wordWrap={options.wordWrap}
              wordDiff={options.wordDiff}
              hideWhitespace={options.hideWhitespace}
              foldLargeFiles={options.foldLargeFiles}
              palette={palette}
            />
          ) : (
            <div className="flex h-16 items-center justify-center font-mono text-caption-2-medium text-text-tertiary">
              暂无文本改动（空文件或二进制变更）
            </div>
          )}
        </div>
      ) : null}
    </article>
  )
}
