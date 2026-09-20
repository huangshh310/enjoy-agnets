/**
 * P0-S 一行芯片：空不画；有启用才画；不支持仍一行。脚注只进 Popover。
 */
import { useState } from "react"
import { RiErrorWarningLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { hostInjectChipLane } from "./host-inject-chip-label.ts"
import { HostInjectPopover } from "./host-inject-popover.tsx"
import type { HostInjectBarView } from "./host-inject-view.ts"
import { useHostInjectBar } from "./use-host-inject-bar.ts"

export function HostInjectBar() {
  const { view, enabledMcp, enabledSkills } = useHostInjectBar()
  if (view.kind === "hidden") return null
  const lane = hostInjectChipLane(enabledMcp, enabledSkills)
  if (!lane) return null
  return (
    <HostInjectChip
      view={view}
      enabledMcp={enabledMcp}
      enabledSkills={enabledSkills}
      lane={lane}
    />
  )
}

function HostInjectChip({
  view,
  enabledMcp,
  enabledSkills,
  lane
}: {
  view: Exclude<HostInjectBarView, { kind: "hidden" }>
  enabledMcp: number
  enabledSkills: number
  lane: "both" | "mcp" | "skills"
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const unsupported = view.kind === "unsupported" || view.kind === "failed"
  const label =
    lane === "both"
      ? t("chat.hostInjectChip", { mcp: enabledMcp, skills: enabledSkills })
      : lane === "mcp"
        ? t("chat.hostInjectChipMcp", { mcp: enabledMcp })
        : t("chat.hostInjectChipSkills", { skills: enabledSkills })
  return (
    <div className="shrink-0" data-testid="host-inject-bar" data-kind={view.kind}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="host-inject-chip"
            className={cx(
              "inline-flex h-6 max-w-full items-center gap-1 rounded-full px-2 text-caption-2-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              unsupported
                ? "bg-background-tertiary-default/80 text-text-tertiary ring-1 ring-border-button-default/80 opacity-70"
                : "bg-accent-500/10 text-accent-600 ring-1 ring-accent-500/20 hover:bg-accent-500/15"
            )}
          >
            <span className="truncate">{label}</span>
            {unsupported ? (
              <RiErrorWarningLine className="size-3 shrink-0 text-text-warning-primary" aria-hidden />
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="rounded-xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
        >
          <HostInjectPopover
            view={view}
            enabledMcp={enabledMcp}
            enabledSkills={enabledSkills}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
