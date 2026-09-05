/**
 * 当前透镜卡：开关纳入本次检索，星标写入工作区默认范围。
 */
import { RiCheckLine, RiEyeLine, RiFilter3Line, RiStarFill, RiStarLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { LENS_DENSITY_DOTS } from "../../constants/knowledge-bento.constants"
import type { KnowledgeLens } from "../../types/knowledge-ui.types"

export function KnowledgeLensCard({
  lenses,
  selectedFolder,
  hitSourceIds,
  hasSearched,
  onSelectFolder,
  onToggleLens,
  onSetDefault
}: {
  lenses: KnowledgeLens[]
  selectedFolder: string | null
  hitSourceIds: string[]
  hasSearched: boolean
  onSelectFolder: (path: string | null) => void
  onToggleLens: (id: string) => void
  onSetDefault: (id: string) => void
}) {
  const t = useT()
  const hitSet = new Set(hitSourceIds)
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all lg:col-span-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-separator-border/40 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <RiEyeLine className="size-4" />
            </div>
            <h4 className="text-caption-1-medium text-text-primary">{t("pages.knowledge.activeLens")}</h4>
          </div>
          <span className="font-mono text-caption-2-medium text-text-tertiary">
            {selectedFolder ? t("pages.knowledge.singleLens") : t("pages.knowledge.allLenses")}
          </span>
        </div>
        <div className="flex max-h-[175px] flex-col gap-1.5 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={cx(
              "flex cursor-pointer items-center justify-between rounded-xl border p-2 transition-colors duration-300",
              selectedFolder === null
                ? "border-accent-500/50 bg-accent-500/10 text-accent-700 dark:text-accent-300"
                : "border-transparent bg-background-secondary-default/40 text-text-secondary hover:bg-background-secondary-default/70"
            )}
          >
            <span className="flex items-center gap-2">
              <RiFilter3Line className="size-3.5 shrink-0 text-text-tertiary" />
              <span className="truncate text-caption-2-medium">{t("pages.knowledge.allReadyLenses")}</span>
            </span>
            {selectedFolder === null ? <RiCheckLine className="size-3.5 text-accent-600" /> : null}
          </button>
          {lenses.map((lens) => (
            <LensRow
              key={lens.id}
              lens={lens}
              focused={selectedFolder === lens.path}
              dimmed={hasSearched && hitSourceIds.length > 0 && !hitSet.has(lens.id)}
              onSelect={() => onSelectFolder(selectedFolder === lens.path ? null : lens.path)}
              onToggle={() => onToggleLens(lens.id)}
              onDefault={() => onSetDefault(lens.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LensRow({
  lens,
  focused,
  dimmed,
  onSelect,
  onToggle,
  onDefault
}: {
  lens: KnowledgeLens
  focused: boolean
  dimmed: boolean
  onSelect: () => void
  onToggle: () => void
  onDefault: () => void
}) {
  const t = useT()
  const dots = Math.min(LENS_DENSITY_DOTS, lens.chunkCount)
  return (
    <div
      onClick={onSelect}
      className={cx(
        "group flex cursor-pointer items-center justify-between rounded-xl border p-2 transition-all duration-300",
        focused
          ? "border-accent-500/50 bg-accent-500/10 text-accent-700 dark:text-accent-300"
          : "border-transparent bg-background-secondary-default/40 text-text-secondary hover:bg-background-secondary-default/70",
        dimmed && "opacity-40"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className={cx(
            "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border",
            lens.enabled
              ? "border-accent-500 bg-accent-500 text-background-primary-default"
              : "border-separator-border/80 bg-background-primary-default"
          )}
          title={lens.enabled ? t("pages.knowledge.includedInSearch") : t("pages.knowledge.excludedFromSearch")}
        >
          {lens.enabled ? <RiCheckLine className="size-3" /> : null}
        </button>
        <span className="truncate font-mono text-caption-2-medium">{lens.path}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="flex gap-px" aria-hidden>
          {dots === 0 ? <span className="size-1.5 rounded-full bg-separator-border/80" /> : null}
          {Array.from({ length: dots }, (_, index) => (
            <span key={index} className="size-1 rounded-full bg-accent-500/50" />
          ))}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDefault()
          }}
          className={cx(
            "cursor-pointer rounded p-0.5",
            lens.isDefault ? "text-accent-500" : "text-text-tertiary opacity-0 group-hover:opacity-100"
          )}
          title={lens.isDefault ? t("pages.knowledge.lensDefault") : t("pages.knowledge.setDefaultLens")}
        >
          {lens.isDefault ? <RiStarFill className="size-3.5" /> : <RiStarLine className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}
