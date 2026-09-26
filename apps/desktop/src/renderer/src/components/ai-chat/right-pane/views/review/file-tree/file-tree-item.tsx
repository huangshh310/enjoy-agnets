/**
 * 文件树单节点渲染组件：
 * 对齐 Codex Image #1 右侧文件树交互：
 * - 目录：箭头指示符 + 文件夹图标 + 名称 + 递归子项
 * - 文件：文件类型徽标 + 纯净文件名 + Git 状态标记字母 (U/M/A/D) 与指示点
 */

import { useState, useMemo, useEffect } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,

  RiFolderLine,
  RiFolderOpenLine
} from "@remixicon/react"
import type { FileTreeNode } from "../types/review.types"
import { STATUS_CONFIG } from "../constants/review-constants"
import { sameReviewPath } from "../same-review-path"
import { useT } from "@renderer/i18n"
import { FileKindMark } from "@renderer/components/ai-chat/file-kind-mark"

export function FileTreeItem(props: {
  node: FileTreeNode
  depth?: number
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  defaultExpanded?: boolean
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const {
    node,
    depth = 0,
    selectedFilePath,
    onSelectFile,
    defaultExpanded = true
  } = props
  const hasSelectedChild = useMemo(() => {
    if (!node.isDir || !selectedFilePath) return false
    const check = (n: FileTreeNode): boolean => {
      if (!n.isDir) return sameReviewPath(n.path, selectedFilePath)
      return (n.children ?? []).some(check)
    }
    return (node.children ?? []).some(check)
  }, [node, selectedFilePath])

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || hasSelectedChild)

  useEffect(() => {
    if (hasSelectedChild) setIsExpanded(true)
  }, [hasSelectedChild])

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

          <span className="truncate font-medium text-text-primary text-caption-1-medium">
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
                onStage={props.onStage}
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
      className={`group flex h-7 w-full items-center justify-between gap-2 pr-2.5 text-left text-caption-1-regular cursor-pointer transition-colors ${
        isSelected
          ? "bg-accent-500/12 text-accent-500 font-semibold"
          : "text-text-secondary hover:bg-background-secondary-hover"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FileKindMark name={node.name} />
        <span className="truncate text-text-primary group-hover:text-accent-500">
          {node.name}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 font-mono text-caption-2-regular">
        <StageToggle node={node} onStage={props.onStage} />
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

function StageToggle(props: {
  node: FileTreeNode
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const t = useT()
  const { node, onStage } = props
  if (!onStage || node.isDir) return null
  const canAdd = node.worktree !== false && node.status !== undefined
  const canUnstage = node.staged === true
  if (canUnstage) {
    return (
      <span
        role="button"
        tabIndex={0}
        title={t("chat.reviewUnstage")}
        onClick={(event) => {
          event.stopPropagation()
          onStage(node.path, "unstage")
        }}
        className="rounded px-1 text-caption-2-regular text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      >
        −
      </span>
    )
  }
  if (!canAdd) return null
  return (
    <span
      role="button"
      tabIndex={0}
      title={t("chat.reviewStage")}
      onClick={(event) => {
        event.stopPropagation()
        onStage(node.path, "add")
      }}
      className="rounded px-1 text-caption-2-regular text-text-tertiary hover:bg-accent-500/15 hover:text-accent-500"
    >
      +
    </span>
  )
}
