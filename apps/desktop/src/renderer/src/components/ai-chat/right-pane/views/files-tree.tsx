/**
 * 工作区目录树：筛选、逐级展开，以及全部展开 / 全部折叠。
 */
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiSubtractLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { cx } from "@/utils/cx"
import { PANE_FOCUS } from "../constants"
import { FileKindIcon } from "../file-kind-icon"
import type { DirEntry } from "./files-entries"
import { useFilesTree } from "./use-files-tree"
import { useT } from "@renderer/i18n"

export function FilesTree({
  workspaceId,
  selectedPath,
  onSelectFile
}: {
  workspaceId: string
  selectedPath: string | null
  onSelectFile: (path: string) => void
}) {
  const tree = useFilesTree(workspaceId)
  const t = useT()

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
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {tree.visible.map((entry) => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            openPaths={tree.openPaths}
            childrenByPath={tree.childrenByPath}
            onToggleDir={(path) => void tree.toggleDir(path)}
            onSelectFile={onSelectFile}
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
  onToggleDir,
  onSelectFile
}: {
  entry: DirEntry
  depth: number
  selectedPath: string | null
  openPaths: Set<string>
  childrenByPath: Record<string, DirEntry[]>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}) {
  const isDir = entry.kind === "directory"
  const open = openPaths.has(entry.path)
  const children = childrenByPath[entry.path] ?? []

  return (
    <div>
      <TreeRow
        entry={entry}
        depth={depth}
        selected={selectedPath === entry.path}
        open={open}
        onClick={() => (isDir ? onToggleDir(entry.path) : onSelectFile(entry.path))}
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
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))
        : null}
    </div>
  )
}

function TreeRow({
  entry,
  depth,
  selected,
  open,
  onClick
}: {
  entry: DirEntry
  depth: number
  selected: boolean
  open: boolean
  onClick: () => void
}) {
  const isDir = entry.kind === "directory"
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: 8 + depth * 12 }}
      className={cx(
        "flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left",
        PANE_FOCUS,
        selected
          ? "bg-background-secondary-default text-text-primary"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      {isDir ? (
        open ? <RiArrowDownSLine className="size-3.5 shrink-0" /> : <RiArrowRightSLine className="size-3.5 shrink-0" />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <FileKindIcon name={entry.name} kind={entry.kind} open={open} />
      <span className="truncate text-caption-1-medium">{entry.name}</span>
    </button>
  )
}
