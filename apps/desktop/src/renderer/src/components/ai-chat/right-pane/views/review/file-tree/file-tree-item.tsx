/**
 * 文件树单节点渲染组件：
 * 对齐 Codex Image #1 右侧文件树交互：
 * - 目录：箭头指示符 + 文件夹图标 + 名称 + 递归子项
 * - 文件：文件类型徽标 + 纯净文件名 + Git 状态标记字母 (U/M/A/D) 与指示点
 */

import { useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileCodeLine,
  RiFolderLine,
  RiFolderOpenLine
} from "@remixicon/react"
import type { FileTreeNode } from "../types/review.types"
import { STATUS_CONFIG } from "../constants/review-constants"
import { sameReviewPath } from "../same-review-path"

export function FileTreeItem(props: {
  node: FileTreeNode
  depth?: number
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  defaultExpanded?: boolean
}) {
  const {
    node,
    depth = 0,
    selectedFilePath,
    onSelectFile,
    defaultExpanded = true
  } = props
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded)

  const isSelected =
    !node.isDir && selectedFilePath != null && sameReviewPath(node.path, selectedFilePath)
  const statusConfig = node.status ? STATUS_CONFIG[node.status] : null

  if (node.isDir) {
    return (
      <div className="flex flex-col select-none">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className="group flex h-7 w-full items-center gap-1.5 pr-2 text-left text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover cursor-pointer transition-colors"
        >
          {isExpanded ? (
            <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
          ) : (
            <RiArrowRightSLine className="size-3.5 text-text-tertiary" />
          )}

          {isExpanded ? (
            <RiFolderOpenLine className="size-4 text-text-tertiary group-hover:text-accent-500" />
          ) : (
            <RiFolderLine className="size-4 text-text-tertiary group-hover:text-accent-500" />
          )}

          <span className="truncate font-medium text-text-primary text-[12.5px]">
            {node.name}
          </span>
        </button>

        {isExpanded && node.children ? (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedFilePath={selectedFilePath}
                onSelectFile={onSelectFile}
                defaultExpanded={defaultExpanded}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${depth * 14 + 14}px` }}
      className={`group flex h-7 w-full items-center justify-between gap-2 pr-2.5 text-left text-[12px] cursor-pointer transition-colors ${
        isSelected
          ? "bg-accent-500/12 text-accent-500 font-semibold"
          : "text-text-secondary hover:bg-background-secondary-hover"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <RiFileCodeLine className="size-3.5 shrink-0 text-accent-500/80 group-hover:text-accent-500" />
        <span className="truncate text-text-primary group-hover:text-accent-500">
          {node.name}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
        {statusConfig ? (
          <span
            title={statusConfig.label}
            className={`font-bold ${statusConfig.tone}`}
          >
            {statusConfig.mark}
          </span>
        ) : null}
      </div>
    </button>
  )
}
