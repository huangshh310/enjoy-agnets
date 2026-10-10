/**
 * 只读查看文件：行号 + 引用行高亮，禁止 +/- / hunk 头。
 */
import { RiCodeSSlashLine } from "@remixicon/react"
import { AiChatCodePane } from "./ai-chat-code-pane"
import { useT } from "@renderer/i18n"

export function SourceFilePreview({ path, content }: { path: string; content: string }) {
  const t = useT()
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 text-caption-1-regular select-none">
        <div className="flex min-w-0 items-center gap-2">
          <RiCodeSSlashLine className="size-4 shrink-0 text-text-tertiary" />
          <span
            data-testid="source-file-path"
            className="min-w-0 truncate font-mono font-semibold text-text-primary"
          >
            {path}
          </span>
        </div>
        <span
          data-testid="source-file-view-mode"
          className="shrink-0 text-caption-2-regular text-text-primary"
        >
          {t("chat.reviewViewFile")}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AiChatCodePane path={path} value={content} />
      </div>
    </div>
  )
}
