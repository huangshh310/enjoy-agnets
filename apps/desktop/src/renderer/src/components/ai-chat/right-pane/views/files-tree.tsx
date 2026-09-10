/**
 * 工作区目录树：筛选、逐级展开，以及拖到文件夹里移动。
 */
import { useState } from "react"
import { RiAddLine, RiSubtractLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import type { DirEntry } from "./files-entries"
import {
  canDropOnEntry,
  canDropOnRoot,
  toDirForEntry,
  type FilesDragPayload
} from "./files-tree-dnd"
import { FilesTreeRow } from "./files-tree-row"
import { useFilesTree } from "./use-files-tree"
import { useT } from "@renderer/i18n"

export function FilesTree({
  workspaceId,
  selectedPath,
  onSelectFile,
  onMove
}: {
  workspaceId: string
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onMove: (from: string, toDir: string) => void
}) {
  const tree = useFilesTree(workspaceId)
  const t = useT()
  const [dragging, setDragging] = useState<FilesDragPayload | null>(null)
  const rootDrop = dragging ? canDropOnRoot(dragging) : false

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col">
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1">
        <input
          value={tree.query}
          onChange={(event) => tree.setQuery(event.target.value)}
          placeholder={t("chat.filterFiles")}
          className="h-8 min-w-0 flex-1 rounded-2lg border border-border-button-default bg-background-secondary-default px-2 text-caption-1-medium text-text-primary outline-none placeholder:text-text-placeholder focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        />
        <QuietIconButton
          icon={RiAddLine}
          aria-label={t("chat.expandFolders")}
          title={t("chat.expandFolders")}
          onClick={() => void tree.expandAll()}
        />
        <QuietIconButton
          icon={RiSubtractLine}
          aria-label={t("chat.collapseFolders")}
          title={t("chat.collapseFolders")}
          onClick={tree.collapseAll}
        />
      </div>
      <div
        data-testid="files-tree-root"
        className="min-h-0 flex-1 overflow-y-auto px-1 py-1"
        onDragOver={(event) => {
          if (!rootDrop) return
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
        }}
        onDrop={(event) => {
          if (event.target !== event.currentTarget) return
          if (!dragging || !rootDrop) return
          event.preventDefault()
          onMove(dragging.path, ".")
          setDragging(null)
        }}
      >
        {tree.visible.map((entry) => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            openPaths={tree.openPaths}
            childrenByPath={tree.childrenByPath}
            dragging={dragging}
            onToggleDir={(path) => void tree.toggleDir(path)}
            onSelectFile={onSelectFile}
            onDragStart={setDragging}
            onDragEnd={() => setDragging(null)}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  )
}

function TreeNode({
  entry,
  depth,
  selectedPath,
  openPaths,
  childrenByPath,
  dragging,
  onToggleDir,
  onSelectFile,
  onDragStart,
  onDragEnd,
  onMove
}: {
  entry: DirEntry
  depth: number
  selectedPath: string | null
  openPaths: Set<string>
  childrenByPath: Record<string, DirEntry[]>
  dragging: FilesDragPayload | null
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
  onDragStart: (payload: FilesDragPayload) => void
  onDragEnd: () => void
  onMove: (from: string, toDir: string) => void
}) {
  const isDir = entry.kind === "directory"
  const open = openPaths.has(entry.path)
  const children = childrenByPath[entry.path] ?? []
  const droppable = dragging ? canDropOnEntry(dragging, entry) : false
  return (
    <div>
      <FilesTreeRow
        entry={entry}
        depth={depth}
        selected={selectedPath === entry.path}
        open={open}
        droppable={droppable}
        grabbing={dragging?.path === entry.path}
        onClick={() => (isDir ? onToggleDir(entry.path) : onSelectFile(entry.path))}
        onDragStart={() => onDragStart({ path: entry.path, kind: entry.kind })}
        onDragEnd={onDragEnd}
        onDrop={() => {
          if (!dragging) return
          onMove(dragging.path, toDirForEntry(entry))
          onDragEnd()
        }}
      />
      {isDir && open
        ? children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              openPaths={openPaths}
              childrenByPath={childrenByPath}
              dragging={dragging}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMove={onMove}
            />
          ))
        : null}
    </div>
  )
}
