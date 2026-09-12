/**
 * 仅官方密表主槽：检测中 / 等待授权 / 打开授权 / 重试授权。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { CLI_LIST_PRIMARY_SLOT } from "../list-layout"
import { officialLoginPrimaryLabel } from "./official-login-row-copy"
import type { OfficialLoginRowPhase } from "./official-login-phase"

export function OfficialLoginPrimary({
  phase,
  onLogin
}: {
  phase: OfficialLoginRowPhase
  onLogin?: () => void
}) {
  const t = useT()
  const label = officialLoginPrimaryLabel(phase, t)
  if (phase === "check") {
    return (
      <Button type="button" size="sm" disabled className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium opacity-50`}>
        {label}
      </Button>
    )
  }
  if (phase === "auth") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium text-text-tertiary`}
      >
        {label}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={phase === "fail" ? "outline" : "default"}
      onClick={onLogin}
      className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium ${
        phase === "fail" ? "border-border-error-default text-text-error-primary" : ""
      }`}
    >
      {label}
    </Button>
  )
}
