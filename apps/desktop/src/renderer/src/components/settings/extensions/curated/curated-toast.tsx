/**
 * 写后安静态：只报已写入 Enjoy，禁止「已同步到助手」。
 */
import { useT } from "@renderer/i18n"
import { EXTENSIONS_COPY } from "../extensions-copy.ts"

export function CuratedToast({ open }: { open: boolean }) {
  const t = useT()
  if (!open) return null
  return (
    <div
      data-testid="extensions-curated-toast"
      className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-full bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary shadow-card ring-1 ring-notification-success-foreground/25"
    >
      <span className="size-1.5 rounded-full bg-notification-success-foreground" />
      <span>{t(EXTENSIONS_COPY.written)}</span>
    </div>
  )
}
