/**
 * 列表动力源胶囊：同高同构，不画额度 / 邮箱 / 协议微标。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatPowerSourceText } from "./format-power-source"

export function PowerSourceCapsule({ parts }: { parts: PowerSourceParts }) {
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
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-1-medium text-text-primary"
      title={text}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{text}</span>
    </span>
  )
}
