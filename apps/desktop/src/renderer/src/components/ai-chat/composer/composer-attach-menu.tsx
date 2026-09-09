/**
 * Composer 左下角：只打开本机文件选择器。没有 @ / /web 假入口。
 */
import { RiAddLine, RiAttachmentLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"

export function ComposerAttachMenu({ onPickFiles }: { onPickFiles: () => void }) {
  const t = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.addSources")}
          title={t("chat.addSources")}
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
        <DropdownMenuItem
          onClick={onPickFiles}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-background-secondary-hover"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
            <RiAttachmentLine className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col text-left">
            <span className="truncate text-body-medium text-text-primary">{t("chat.addPhotos")}</span>
            <span className="truncate text-caption-2-medium text-text-tertiary">{t("chat.uploadComputer")}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
