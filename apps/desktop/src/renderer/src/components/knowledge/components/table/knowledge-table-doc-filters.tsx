/**
 * 文档 tab 的状态与格式胶囊。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getSupportedFileFormats } from "../../knowledge-constants"
import type { KnowledgeDocumentItem } from "@enjoy-agents/ipc-contract"

export function KnowledgeTableDocFilters(props: {
  documents: KnowledgeDocumentItem[]
  askableCount: number
  statusFilter: "all" | "askable" | "unindexed"
  selectedFormat: string | null
  onStatusChange: (status: "all" | "askable" | "unindexed") => void
  onFormatChange: (format: string | null) => void
}) {
  const t = useT()
  const scannedOnly = Math.max(0, props.documents.length - props.askableCount)
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-1">
      <div className="flex items-center gap-1 rounded-xl border border-separator-border/40 bg-background-secondary-default/70 p-0.5 text-caption-2-medium">
        <FilterChip
          active={props.statusFilter === "all"}
          label={t("pages.knowledge.filterAllCount", { n: props.documents.length })}
          onClick={() => props.onStatusChange("all")}
        />
        <FilterChip
          active={props.statusFilter === "askable"}
          label={`${t("pages.knowledge.statusAskable")} (${props.askableCount})`}
          onClick={() => props.onStatusChange("askable")}
        />
        <FilterChip
          active={props.statusFilter === "unindexed"}
          label={`${t("pages.knowledge.statusScannedOnly")} (${scannedOnly})`}
          onClick={() => props.onStatusChange("unindexed")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <FormatChip
          label={t("pages.knowledge.allFormats", { n: props.documents.length })}
          active={props.selectedFormat === null}
          onClick={() => props.onFormatChange(null)}
        />
        {getSupportedFileFormats(t).map((format) => {
          const count = props.documents.filter((doc) => doc.path.endsWith(format.ext)).length
          if (count === 0 && props.documents.length > 0) return null
          return (
            <FormatChip
              key={format.ext}
              label={`${format.ext} (${count})`}
              active={props.selectedFormat === format.ext}
              onClick={() =>
                props.onFormatChange(props.selectedFormat === format.ext ? null : format.ext)
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function FilterChip(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cx(
        "cursor-pointer rounded-lg px-2.5 py-1 transition-colors",
        props.active
          ? "bg-background-primary-default text-text-primary shadow-2xs"
          : "text-text-tertiary hover:text-text-secondary"
      )}
    >
      {props.label}
    </button>
  )
}

function FormatChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cx(
        "rounded-lg border px-2 py-0.5 text-caption-2-medium",
        props.active
          ? "border-accent-500 bg-accent-500/10 text-accent-500"
          : "border-border-button-default bg-background-secondary-default text-text-tertiary"
      )}
    >
      {props.label}
    </button>
  )
}
