/**
 * Composer 左下角：本地附件 / 工作区 @ / 网页搜索。
 */
import { RiAddLine, RiAttachmentLine, RiFolder6Line, RiGlobalLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export function ComposerAttachMenu({
  composer,
  onComposerChange,
  onPickFiles
}: {
  composer: string
  onComposerChange: (value: string) => void
  onPickFiles: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add photos, files & sources"
          title="Add photos, files & sources"
          className="flex size-7.5 items-center justify-center rounded-full border border-border-button-default/50 text-foreground-icon-secondary shadow-2xs transition-all hover:scale-105 hover:border-border-button-default hover:bg-background-secondary-hover hover:text-text-primary active:scale-95"
        >
          <RiAddLine className="size-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 rounded-2xl border-none bg-background-primary-default p-1.5 shadow-card backdrop-blur-md"
      >
        <AttachMenuRow
          icon={RiAttachmentLine}
          title="Add photos & files"
          hint="Upload from your computer"
          onClick={onPickFiles}
        />
        <AttachMenuRow
          icon={RiFolder6Line}
          title="Workspace files"
          hint="Reference files & docs (@)"
          onClick={() => onComposerChange(composer ? `${composer} @` : "@")}
        />
        <AttachMenuRow
          icon={RiGlobalLine}
          title="Web search"
          hint="Real-time web & documentation"
          onClick={() => onComposerChange(composer ? `${composer} /web ` : "/web ")}
        />
        <div className="mt-1 border-t border-separator-border px-3 pt-2 pb-1 text-caption-2-medium text-text-tertiary">
          Type @ for files, / for actions
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AttachMenuRow({
  icon: Icon,
  title,
  hint,
  onClick
}: {
  icon: typeof RiAddLine
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-background-secondary-hover"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-col text-left">
        <span className="truncate text-body-medium text-text-primary">{title}</span>
        <span className="truncate text-caption-2-medium text-text-tertiary">{hint}</span>
      </div>
    </DropdownMenuItem>
  )
}
