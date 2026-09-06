/**
 * 可点击域名胶囊：打开右栏浏览器。图标用 Remix，不用地球 emoji。
 */
import { RiGlobalLine } from "@remixicon/react"
import { openBrowserUrl } from "@renderer/components/ai-chat/right-pane/open-pane"
import { useT } from "@renderer/i18n"
import type { DomainPill } from "../agent-step-tree.types"

export function DomainPills({ pills }: { pills: DomainPill[] }) {
  const t = useT()
  if (pills.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          title={pill.url ? t("chat.visitSite", { url: pill.url }) : pill.label}
          onClick={() => pill.url && openBrowserUrl(pill.url)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary transition-colors hover:border-accent-500/40 hover:text-accent-500"
        >
          <RiGlobalLine className="size-3 text-text-tertiary" />
          <span>{pill.label}</span>
        </button>
      ))}
    </div>
  )
}
