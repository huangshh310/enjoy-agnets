/**
 * 12 粒来源状态芯片。文案走查表，禁止 claude 三元式回落 Codex。
 */
import type { CliUsageSource } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { sourceChipStatusKey, sourceNameKey } from "../lib/source-chip-copy"

function chipRank(source: CliUsageSource): number {
  if (source.status === "has-usage") return 0
  if (source.status === "scanned-empty") return 1
  if (source.status === "directory-missing") return 2
  return 3
}

export function CliUsageSourceChips({ sources }: { sources: CliUsageSource[] }) {
  const ordered = [...sources].sort((left, right) => chipRank(left) - chipRank(right))
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {ordered.map((source) => (
        <SourceChip key={source.id} source={source} />
      ))}
    </div>
  )
}

function SourceChip({ source }: { source: CliUsageSource }) {
  const t = useT()
  const name = t(sourceNameKey(source.id))
  const text = t(sourceChipStatusKey(source), { name, n: source.sessionCount })
  const active = source.status === "has-usage"
  return (
    <span
      className={cx(
        "rounded-full px-2.5 py-1 text-caption-2-medium",
        active
          ? "border border-separator-border/70 bg-background-primary-default text-text-secondary"
          : "border border-dashed border-separator-border text-text-tertiary"
      )}
    >
      {text}
    </span>
  )
}
