/**
 * 工作区状态、钉入芯片与本轮引用源。
 */
import { RiBookOpenLine, RiFolder6Line, RiSparklingFill } from "@remixicon/react"
import type { CitedSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { SessionContextChip } from "@renderer/hooks/session-context-chips"
import { ContextChipPill } from "./context-chip-pill"

export function InspectorGroundingCard({
  workspaceName,
  changesCount,
  chips,
  sources,
  onSelectSource
}: {
  workspaceName: string
  changesCount: number
  chips: SessionContextChip[]
  sources: CitedSource[]
  onSelectSource?: (source: CitedSource) => void
}) {
  const t = useT()
  const activeChipsCount = chips.filter((chip) => chip.enabled !== false).length

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
          <RiBookOpenLine className="size-4 text-accent-500" />
          <span>{t("chat.inspectorActiveSources")}</span>
        </div>
        {chips.length > 0 ? (
          <span className="font-mono text-caption-2-regular text-text-tertiary">
            {t("chat.inspectorChipsActive", { active: activeChipsCount, total: chips.length })}
          </span>
        ) : null}
      </div>

      <WorkspaceRow workspaceName={workspaceName} changesCount={changesCount} />
      <ChipSection chips={chips} />
      {sources.length > 0 ? (
        <SourceList sources={sources} onSelectSource={onSelectSource} />
      ) : null}
    </section>
  )
}

function WorkspaceRow({
  workspaceName,
  changesCount
}: {
  workspaceName: string
  changesCount: number
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between rounded-lg border border-separator-border/50 bg-background-secondary-default/30 px-2.5 py-1.5 text-caption-2-medium">
      <div className="flex min-w-0 items-center gap-1.5">
        <RiFolder6Line className="size-3.5 shrink-0 text-accent-500" />
        <span className="truncate font-medium text-text-primary">
          {workspaceName || t("chat.inspectorWorkspaceOff")}
        </span>
      </div>
      <span className="shrink-0 font-mono text-caption-2-regular text-text-secondary">
        {changesCount > 0
          ? t("chat.inspectorFilesDirty", { n: changesCount })
          : t("chat.inspectorTreeClean")}
      </span>
    </div>
  )
}

function ChipSection({ chips }: { chips: SessionContextChip[] }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-caption-2-regular">
        <span className="font-semibold uppercase tracking-wider text-text-tertiary">
          {t("chat.inspectorChips")}
        </span>
        {chips.length > 0 ? (
          <span className="text-text-tertiary">{t("chat.inspectorPinHint")}</span>
        ) : null}
      </div>
      {chips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-separator-border/60 bg-background-secondary-default/20 px-2.5 py-2 text-center text-caption-2-regular text-text-tertiary">
          {t("chat.inspectorEmptyChips")}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <ContextChipPill key={chip.id} chip={chip} />
          ))}
        </div>
      )}
    </div>
  )
}

function SourceList({
  sources,
  onSelectSource
}: {
  sources: CitedSource[]
  onSelectSource?: (source: CitedSource) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5 border-t border-separator-border/40 pt-2.5">
      <span className="text-caption-2-regular font-semibold uppercase tracking-wider text-text-tertiary">
        {t("chat.inspectorSources", { n: sources.length })}
      </span>
      <div className="flex flex-col gap-1">
        {sources.map((source, index) => (
          <button
            key={`${source.path}-${index}`}
            type="button"
            onClick={() => onSelectSource?.(source)}
            className="flex items-center gap-2 rounded-lg border border-border-button-default/50 bg-background-secondary-default/30 px-2.5 py-1.5 text-left transition-colors hover:bg-background-secondary-hover"
          >
            <RiSparklingFill className="size-3.5 shrink-0 text-accent-500" />
            <div className="min-w-0 flex-1 font-mono">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-caption-2-medium font-semibold text-text-primary">
                  {source.title || source.path}
                </p>
                <span className="shrink-0 text-caption-2-medium text-accent-500">
                  {t("chat.inspectorViewChunk")}
                </span>
              </div>
              <p className="truncate text-caption-2-regular text-text-tertiary">
                {source.path}
                {source.startLine ? ` (L${source.startLine})` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
