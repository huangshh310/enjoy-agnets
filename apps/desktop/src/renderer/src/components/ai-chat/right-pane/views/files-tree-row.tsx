/**
 * 目录树一行：点击打开，拖到目录上移动。
 */
import type { DragEvent } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { PANE_FOCUS } from "../constants"
import { FileKindIcon } from "../file-kind-icon"
import type { DirEntry } from "./files-entries"
import { useT } from "@renderer/i18n"

type RowProps = {
  entry: DirEntry
  depth: number
  selected: boolean
  open: boolean
  droppable: boolean
  grabbing: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
}

export function FilesTreeRow(props: RowProps) {
  const t = useT()
  const { entry, depth, selected, open, droppable, grabbing, onClick } = props
  const isDir = entry.kind === "directory"
  return (
    <button
      type="button"
      draggable
      data-testid="files-tree-row"
      data-path={entry.path}
      data-kind={entry.kind}
      aria-grabbed={grabbing}
      title={droppable ? t("chat.dropToMove") : entry.name}
      onClick={onClick}
      {...dragHandlers(props)}
      style={{ paddingLeft: 8 + depth * 12 }}
      className={rowClass(selected, droppable, grabbing)}
    >
      {isDir ? (
        open ? <RiArrowDownSLine className="size-3.5 shrink-0" /> : <RiArrowRightSLine className="size-3.5 shrink-0" />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <FileKindIcon name={entry.name} kind={entry.kind} open={open} />
      <span title={entry.name} className="min-w-0 truncate text-caption-1-medium leading-5 py-px">
        {entry.name}
      </span>
    </button>
  )
}

function dragHandlers({ entry, droppable, onDragStart, onDragEnd, onDrop }: RowProps) {
  return {
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData("text/plain", entry.path)
      event.dataTransfer.effectAllowed = "move"
      onDragStart()
    },
    onDragEnd,
    onDragOver: (event: DragEvent) => {
      event.stopPropagation()
      if (!droppable) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!droppable) return
      onDrop()
    }
  }
}

function rowClass(selected: boolean, droppable: boolean, grabbing: boolean) {
  return cx(
    "flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left",
    PANE_FOCUS,
    grabbing ? "opacity-60" : null,
    droppable
      ? "bg-accent-500/15 text-text-primary ring-1 ring-inset ring-accent-500"
      : selected
        ? "bg-background-secondary-default text-text-primary"
        : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
  )
}
