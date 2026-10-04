/**
 * 文件树单节点：目录可折叠并按列出的叶子暂存；文件行保留单路径 +/−。
 */
import { useEffect, useMemo, useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine, RiFolderLine, RiFolderOpenLine } from "@remixicon/react"
import type { FileTreeNode } from "../types/review.types"
import { STATUS_CONFIG } from "../constants/review-constants"
import { sameReviewPath } from "../same-review-path"
import { useT } from "@renderer/i18n"
import { FileKindMark } from "@renderer/components/ai-chat/file-kind-mark"
import { listedStagePaths } from "./listed-stage-paths"

export function FileTreeItem(props: {
  node: FileTreeNode
  depth?: number
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  defaultExpanded?: boolean
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const { node, depth = 0, selectedFilePath, onSelectFile, defaultExpanded = true } = props
  const hasSelectedChild = useMemo(
    () => containsSelected(node, selectedFilePath),
    [node, selectedFilePath]
  )
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || hasSelectedChild)

  useEffect(() => {
    if (hasSelectedChild) setIsExpanded(true)
  }, [hasSelectedChild])

  if (node.isDir) {
    return (
      <DirectoryTreeItem
        node={node}
        depth={depth}
        expanded={isExpanded}
        onToggle={() => setIsExpanded((prev) => !prev)}
        selectedFilePath={selectedFilePath}
        onSelectFile={onSelectFile}
        defaultExpanded={defaultExpanded}
        onStage={props.onStage}
      />
    )
  }

  const selected = selectedFilePath != null && sameReviewPath(node.path, selectedFilePath)
  return (
    <FileTreeFile
      node={node}
      depth={depth}
      selected={selected}
      onSelectFile={onSelectFile}
      onStage={props.onStage}
    />
  )
}

function containsSelected(node: FileTreeNode, selectedFilePath: string | null): boolean {
  if (!node.isDir || !selectedFilePath) return false
  const check = (current: FileTreeNode): boolean => {
    if (!current.isDir) return sameReviewPath(current.path, selectedFilePath)
    return (current.children ?? []).some(check)
  }
  return (node.children ?? []).some(check)
}

function DirectoryTreeItem(props: {
  node: FileTreeNode
  depth: number
  expanded: boolean
  onToggle: () => void
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  defaultExpanded: boolean
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const { node, depth, expanded, onToggle, selectedFilePath, onSelectFile, defaultExpanded, onStage } = props
  return (
    <div className="flex flex-col select-none">
      <button
        type="button"
        onClick={onToggle}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className="group flex min-h-7 w-full items-center gap-1.5 py-0.5 pr-2 text-left text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover cursor-pointer transition-colors"
      >
        <FolderGlyph expanded={expanded} />
        <span
          title={node.name}
          className="min-w-0 flex-1 truncate font-medium leading-5 py-px text-text-primary text-caption-1-medium"
        >
          {node.name}
        </span>
        <FolderStage node={node} onStage={onStage} />
      </button>
      {expanded && node.children ? (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
              defaultExpanded={defaultExpanded}
              onStage={onStage}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FolderGlyph(props: { expanded: boolean }) {
  const Arrow = props.expanded ? RiArrowDownSLine : RiArrowRightSLine
  const Folder = props.expanded ? RiFolderOpenLine : RiFolderLine
  return (
    <>
      <Arrow className="size-3.5 text-text-tertiary" />
      <Folder className="size-4 text-text-tertiary group-hover:text-accent-500" />
    </>
  )
}

function FileTreeFile(props: {
  node: FileTreeNode
  depth: number
  selected: boolean
  onSelectFile: (path: string) => void
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const { node, depth, selected, onSelectFile, onStage } = props
  const statusConfig = node.status ? STATUS_CONFIG[node.status] : null
  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${depth * 14 + 14}px` }}
      className={`group flex min-h-7 w-full items-center justify-between gap-2 py-0.5 pr-2.5 text-left text-caption-1-regular cursor-pointer transition-colors ${
        selected
          ? "bg-accent-500/12 text-accent-500 font-semibold"
          : "text-text-secondary hover:bg-background-secondary-hover"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FileKindMark name={node.name} />
        <span title={node.name} className="min-w-0 truncate leading-5 py-px text-text-primary group-hover:text-accent-500">
          {node.name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 font-mono text-caption-2-regular">
        <StageToggle node={node} onStage={onStage} />
        {statusConfig ? (
          <span title={statusConfig.label} className={`font-bold ${statusConfig.tone}`}>
            {statusConfig.mark}
          </span>
        ) : null}
      </div>
    </button>
  )
}

function FolderStage(props: {
  node: FileTreeNode
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const t = useT()
  const { node, onStage } = props
  if (!onStage) return null
  const canUnstage = listedStagePaths([node], node.path, "unstage").length > 0
  const canAdd = listedStagePaths([node], node.path, "add").length > 0
  if (!canUnstage && !canAdd) return null
  return (
    <span className="flex shrink-0 items-center gap-1 font-mono text-caption-2-regular">
      {canUnstage ? (
        <StageMark
          title={t("chat.reviewUnstageFolder")}
          mark="−"
          tone="hover:bg-background-secondary-hover hover:text-text-primary"
          onClick={() => onStage(node.path, "unstage")}
        />
      ) : null}
      {canAdd ? (
        <StageMark
          title={t("chat.reviewStageFolder")}
          mark="+"
          tone="hover:bg-accent-500/15 hover:text-accent-500"
          onClick={() => onStage(node.path, "add")}
        />
      ) : null}
    </span>
  )
}

function StageToggle(props: {
  node: FileTreeNode
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const t = useT()
  const { node, onStage } = props
  if (!onStage || node.isDir) return null
  const canUnstage = node.staged === true
  const canAdd = node.worktree === true && node.status !== undefined
  if (!canUnstage && !canAdd) return null
  return (
    <>
      {canUnstage ? (
        <StageMark
          title={t("chat.reviewUnstage")}
          mark="−"
          tone="hover:bg-background-secondary-hover hover:text-text-primary"
          onClick={() => onStage(node.path, "unstage")}
        />
      ) : null}
      {canAdd ? (
        <StageMark
          title={t("chat.reviewStage")}
          mark="+"
          tone="hover:bg-accent-500/15 hover:text-accent-500"
          onClick={() => onStage(node.path, "add")}
        />
      ) : null}
    </>
  )
}

function StageMark(props: { title: string; mark: string; tone: string; onClick: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={props.title}
      onClick={(event) => {
        event.stopPropagation()
        props.onClick()
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        event.stopPropagation()
        props.onClick()
      }}
      className={`rounded px-1 text-caption-2-regular text-text-tertiary ${props.tone}`}
    >
      {props.mark}
    </span>
  )
}
