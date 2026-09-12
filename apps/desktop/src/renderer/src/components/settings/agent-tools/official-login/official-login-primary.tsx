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
  const busy = phase === "check" || phase === "auth"
  const failed = phase === "fail"
  return (
    <Button
      type="button"
      size="sm"
      variant={failed ? "outline" : "default"}
      disabled={busy}
      onClick={onLogin}
      className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium ${
        failed ? "border-border-error-default text-text-error-primary" : ""
      } ${busy ? "opacity-90" : ""}`}
    >
      {officialLoginPrimaryLabel(phase, t)}
    </Button>
  )
}
