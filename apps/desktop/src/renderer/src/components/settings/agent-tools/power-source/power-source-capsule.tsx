/**
 * 列表动力源胶囊：同高同构、贴左。未装或空档案画 —，不画额度。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatPowerSourceText, isBlankPowerSource } from "./format-power-source"

/** 表行动力源格：已装画胶囊，缺省或未找到只写破折号。 */
export function PowerSourceCell({
  parts,
  accent,
  empty
}: {
  parts: PowerSourceParts
  accent: boolean
  empty?: boolean
}) {
  const t = useT()
  if (empty || isBlankPowerSource(parts)) {
    return <span className="text-caption-1-regular text-text-tertiary">—</span>
  }
  const text = formatPowerSourceText(parts, t)
  // CLI-A：未确认登录用纯字；只有已登录才画描边胶囊。
  if (parts.mode === "official" && parts.official !== "in") {
    return (
      <span className="truncate text-caption-1-regular text-text-tertiary" title={text}>
        {text}
      </span>
    )
  }
  if (parts.mode === "official" && parts.official === "in") {
    return (
      <span
        className="inline-flex max-w-full truncate rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium text-text-primary ring-1 ring-border-button-default"
        title={text}
      >
        {text}
      </span>
    )
  }
  return <PowerSourceCapsule parts={parts} accent={accent} />
}

export function PowerSourceCapsule({
  parts,
  accent = false
}: {
  parts: PowerSourceParts
  /** 主引擎且已绑档案时描强调边，对齐预览。 */
  accent?: boolean
}) {
  const t = useT()
  const text = formatPowerSourceText(parts, t)
  const dot =
    parts.mode === "official"
      ? parts.official === "in"
        ? "bg-notification-success-foreground"
        : parts.official === "fail"
          ? "bg-text-error-primary"
          : parts.official === "auth" || parts.official === "check"
            ? "bg-accent-500"
            : "bg-text-tertiary"
      : parts.mode === "omp"
        ? "bg-accent-600"
        : "bg-accent-500"
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-caption-1-medium text-text-primary ${
        accent
          ? "border border-accent-500/30 bg-background-primary-default"
          : "border border-border-button-default bg-background-secondary-default/50"
      }`}
      title={text}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{text}</span>
    </span>
  )
}
