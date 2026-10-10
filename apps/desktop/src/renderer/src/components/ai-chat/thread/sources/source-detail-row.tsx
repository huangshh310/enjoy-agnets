/**
 * 本轮来源 sheet 一行：图标 · 名称 · 类型标 · 出处。选中才着 accent。
 */
import { useT, type TranslateFn } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { sourceBadgeIcon, sourceBadgeLabelKey } from "./source-badge"
import { sourceBadgeKind, sourceRowName, sourceRowProvenance } from "./source-detail"
import { canActivateSourceRow } from "./source-row-action"
import type { SourceBadgeKind } from "./source-detail"
import type { TurnSourceChip } from "./source-chip"

export function SourceDetailRow({
  chip,
  selected,
  expanded,
  onOpen
}: {
  chip: TurnSourceChip
  selected: boolean
  expanded?: boolean
  onOpen: (chip: TurnSourceChip) => void
}) {
  const t = useT()
  const badge = sourceBadgeKind(chip.kind)
  const activatable = canActivateSourceRow(chip)
  const body = <SourceRowBody chip={chip} badge={badge} expanded={expanded} t={t} />
  const rowClass = cx(
    "flex w-full items-start gap-2 px-3 py-2.5 text-left",
    selected ? "bg-accent-500/10" : "hover:bg-background-secondary-hover"
  )

  if (activatable) {
    return (
      <li>
        <button
          type="button"
          data-testid="turn-source-row"
          data-kind={badge}
          data-path={chip.path ?? ""}
          data-selected={selected ? "true" : "false"}
          data-expanded={expanded ? "true" : "false"}
          onClick={() => onOpen(chip)}
          className={rowClass}
        >
          {body}
        </button>
      </li>
    )
  }

  return (
    <li>
      <div
        data-testid="turn-source-row"
        data-kind={badge}
        data-path={chip.path ?? ""}
        data-selected={selected ? "true" : "false"}
        className={rowClass}
      >
        {body}
      </div>
    </li>
  )
}

function SourceRowBody({
  chip,
  badge,
  expanded,
  t
}: {
  chip: TurnSourceChip
  badge: SourceBadgeKind
  expanded?: boolean
  t: TranslateFn
}) {
  const Icon = sourceBadgeIcon(badge)
  const provenance = sourceRowProvenance(chip, (server) => t("chat.sourcesSheetMcpProvenance", { name: server }))
  return (
    <>
      <span
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background-secondary-default text-foreground-icon-tertiary ring-1 ring-border-button-default"
        aria-hidden="true"
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-caption-1-medium text-text-primary">{sourceRowName(chip)}</span>
          <span className="shrink-0 rounded bg-background-secondary-default px-1.5 py-px text-caption-2-regular text-text-secondary ring-1 ring-border-button-default">
            {t(sourceBadgeLabelKey(badge))}
          </span>
          {chip.fromEnjoy ? (
            <span className="shrink-0 rounded bg-accent-500/10 px-1.5 py-px text-caption-2-regular text-accent-600 ring-1 ring-accent-500/20">
              {t("chat.hostInjectFromEnjoy")}
            </span>
          ) : null}
        </span>
        {provenance ? (
          <span className="mt-0.5 block truncate font-mono text-caption-2-regular text-text-primary">
            {provenance}
          </span>
        ) : null}
        {expanded && chip.snippet?.trim() ? (
          <span
            data-testid="turn-source-snippet"
            className="mt-1.5 block whitespace-pre-wrap break-all text-caption-2-regular text-text-primary"
          >
            {chip.snippet}
          </span>
        ) : null}
      </span>
    </>
  )
}
