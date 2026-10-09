/**
 * @ 发现里的桌面 / 应用行：默认只出展示名；bundle id / pid 仅开发者档。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import type { DesktopMentionItem } from "../mention-items.ts"

export function DesktopMentionRow({ item, active }: { item: DesktopMentionItem; active: boolean }) {
  const t = useT()
  const host = item.role === "host"
  const unstable = item.role === "app" && !item.stable
  const caption = host ? t("chat.mentionDesktopHostHint") : appCaption(item, t)
  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-2"
      data-desktop-role={item.role}
      data-stable={item.stable ? "true" : "false"}
      data-always-allow={unstable ? "hidden" : "n/a"}
    >
      <span
        className={cx(
          "flex size-7 shrink-0 items-center justify-center rounded-md text-caption-1-semibold ring-1",
          active
            ? "bg-accent-500/10 text-accent-600 ring-border-button-default"
            : "bg-background-secondary-default text-text-primary ring-border-button-default"
        )}
      >
        {host ? "🖥" : initial(item.displayName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-2-semibold text-text-primary">{item.displayName}</span>
        {caption ? (
          <span className="block truncate font-mono text-caption-2-medium text-text-tertiary">{caption}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        {unstable ? (
          <span className="block text-caption-2-semibold text-status-yellow-text">
            {t("chat.mentionDesktopAlwaysHidden")}
          </span>
        ) : (
          <span className="text-caption-2-medium text-text-tertiary">
            {active && !host ? t("chat.mentionDesktopSelected") : `@${item.token}`}
          </span>
        )}
      </span>
    </span>
  )
}

function appCaption(
  item: DesktopMentionItem,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (!isDevCopyEnabled()) return ""
  if (item.stable && item.appKey) return item.appKey
  if (item.pid) return t("chat.mentionDesktopUnstableHint", { pid: item.pid })
  return ""
}

function initial(name: string): string {
  const trim = name.trim()
  return trim ? trim.slice(0, 1) : "?"
}
