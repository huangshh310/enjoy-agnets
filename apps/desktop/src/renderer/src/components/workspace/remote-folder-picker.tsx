/**
 * 远端目录浏览器：只选文件夹当工作区根，文件行不可选。
 */
import {
  RiArrowUpLine,
  RiCheckLine,
  RiFolder6Line,
  RiLoader4Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import type { SshBrowseResult } from "@enjoy-agents/ipc-contract"

export function RemoteFolderPicker({
  listing,
  busy,
  onOpen,
  onUse
}: {
  listing: SshBrowseResult
  busy: boolean
  onOpen: (path: string) => void
  onUse: (path: string) => void
}) {
  const t = useT()
  const dirs = listing.entries.filter((item) => item.kind === "directory")

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-3.5 shadow-xs">
      {/* 路径条与返回上一级 */}
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/60 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <RiFolder6Line className="size-4 text-accent-500 shrink-0" />
          <span className="truncate font-mono text-caption-2-medium text-text-primary">
            {listing.path}
          </span>
        </div>
        {listing.parent ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-text-secondary hover:text-text-primary shrink-0 cursor-pointer"
            disabled={busy}
            onClick={() => onOpen(listing.parent!)}
          >
            <RiArrowUpLine className="size-3.5" />
            <span>{t("pages.workspaces.createProject.browseUp")}</span>
          </Button>
        ) : null}
      </div>

      {/* 目录列表 */}
      <div className="flex max-h-48 flex-col overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 divide-y divide-separator-border/40">
        {busy ? (
          <div className="flex items-center justify-center gap-2 py-6 text-caption-2-regular text-text-tertiary">
            <RiLoader4Line className="size-4 animate-spin text-accent-500" />
            <span>{t("pages.workspaces.createProject.readingDir")}</span>
          </div>
        ) : dirs.length === 0 ? (
          <div className="py-6 px-3 text-center text-caption-2-regular text-text-tertiary">
            {t("pages.workspaces.createProject.remoteEmptyDir")}
          </div>
        ) : (
          dirs.map((item) => (
            <button
              key={item.name}
              type="button"
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-caption-2-medium rounded-lg hover:bg-background-secondary-hover text-text-primary transition-colors cursor-pointer"
              disabled={busy}
              onClick={() => onOpen(`${listing.path === "/" ? "" : listing.path}/${item.name}`)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <RiFolder6Line className="size-3.5 text-accent-500/80 shrink-0" />
                <span className="font-mono text-caption-2-regular truncate">{item.name}</span>
              </div>
              <span className="text-[10px] text-text-tertiary">{t("pages.workspaces.createProject.dirKind")}</span>
            </button>
          ))
        )}
      </div>

      {/* 底部确认选择 */}
      <div className="flex items-center justify-end pt-1">
        <Button
          size="sm"
          type="button"
          disabled={busy}
          onClick={() => onUse(listing.path)}
          className="h-8 gap-1.5 text-caption-2-medium font-medium shadow-xs cursor-pointer"
        >
          <RiCheckLine className="size-3.5" />
          <span>{t("pages.workspaces.createProject.useRemoteDir")}</span>
        </Button>
      </div>
    </div>
  )
}

