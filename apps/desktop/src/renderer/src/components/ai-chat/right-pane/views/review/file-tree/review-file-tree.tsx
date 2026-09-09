/**
 * 审查栏右侧文件树面板组件：
 * 对齐 Codex Image #1 & #6 右侧文件目录树。
 * 具备“筛选文件...”即时搜索框、层级折叠目录树、Git 变更状态指示与高亮同步。
 */

import { useState, useMemo } from "react"
import { RiCloseLine, RiSearchLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { buildFileTree } from "./build-file-tree"
import { FileTreeItem } from "./file-tree-item"

export function ReviewFileTree(props: {
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const { changes, selectedFilePath, onSelectFile } = props
  const t = useT()
  const [filterQuery, setFilterQuery] = useState("")

  const tree = useMemo(
    () => buildFileTree(changes, filterQuery),
    [changes, filterQuery]
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background-primary-default select-none">
      {/* 顶部搜索框 (对齐 Codex "🔍 筛选文件...") */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-separator-border/70 px-2.5 py-1.5 bg-background-secondary-default/40">
        <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t("chat.reviewFilterFiles")}
          className="w-full bg-transparent text-caption-2-medium text-text-primary placeholder:text-text-tertiary focus:outline-hidden"
        />
        {filterQuery ? (
          <button
            type="button"
            onClick={() => setFilterQuery("")}
            className="cursor-pointer text-text-tertiary hover:text-text-primary"
          >
            <RiCloseLine className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* 目录树展示区 */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-caption-2-medium text-text-tertiary">
            {t("chat.reviewNoMatchingFiles")}
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
              onStage={props.onStage}
            />
          ))
        )}
      </div>
    </div>
  )
}
