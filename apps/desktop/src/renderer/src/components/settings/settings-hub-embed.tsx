/**
 * 设置内嵌技能 / MCP：正文留在设置壳，独立中心用显式链打开。
 */
import type { ReactNode } from "react"
import { RiArrowRightUpLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"

export function SettingsHubEmbed({
  openLabel,
  onOpenHub,
  children
}: {
  openLabel: string
  onOpenHub: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 justify-end px-8 pt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="settings-open-hub"
          onClick={onOpenHub}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 text-caption-2-medium"
        >
          <span>{openLabel}</span>
          <RiArrowRightUpLine className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
