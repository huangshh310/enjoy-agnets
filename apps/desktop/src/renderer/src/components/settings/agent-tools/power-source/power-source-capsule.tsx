/**
 * 列表动力源胶囊：同高同构，不画额度 / 邮箱 / 协议微标。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatPowerSourceText } from "./format-power-source"

/** 表行动力源格：胶囊 + 仅官方额度的配置提示。 */
export function PowerSourceCell({
  parts,
  accent,
  quotaHint
}: {
  parts: PowerSourceParts
  accent: boolean
  quotaHint: boolean
}) {
  const t = useT()
  return (
    <div className="min-w-0">
      <PowerSourceCapsule parts={parts} accent={accent} />
      {quotaHint ? (
        <p className="mt-1 truncate text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.quotaInConfigHint")}
        </p>
      ) : null}
    </div>
  )
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
        : "bg-text-tertiary"
      : "bg-accent-500"
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-caption-1-medium text-text-primary ${
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
