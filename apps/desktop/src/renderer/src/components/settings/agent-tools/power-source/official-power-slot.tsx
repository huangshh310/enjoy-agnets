/**
 * 仅官方助手的决策槽：只读登录态 + 打开授权。禁止假 vault 下拉。
 */
import { RiLoginBoxLine } from "@remixicon/react"
import { capabilitiesOf, officialLoginState, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import type { AgentToolActions } from "../use-agent-tool-actions"
import {
  officialLoginHint,
  officialLoginPrimaryLabel
} from "../official-login/official-login-row-copy"
import { formatPowerSourceText } from "./format-power-source"
import { powerSourcePartsForTool } from "./resolve-row-source"

export function OfficialPowerSlot({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const inspecting = useSettingsSnapshot().isInspectingAccounts
  const loop = useCliLoginLoop(tool.id)
  const parts = powerSourcePartsForTool(tool, { inspecting, loginLoop: loop.phase })
  const phase = officialLoginState(tool.authAccount?.loggedIn ?? null, inspecting, loop.phase)
  const canLogin = capabilitiesOf(tool).login && tool.status === "ready"
  const busy = phase === "auth" || phase === "check"
  const hint = officialLoginHint(phase, loop.reason, t)
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border-button-default bg-background-secondary-default/40 px-3 py-2.5">
        <p className="text-caption-1-medium text-text-primary">
          {t("settings.agentTools.officialModeTitle")}
        </p>
        <p className="mt-1 text-caption-2-regular text-text-tertiary">
          {formatPowerSourceText(parts, t)}
        </p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.officialNoVaultHint")}
        </p>
        {hint ? (
          <p
            className={`mt-1 text-caption-2-regular ${
              phase === "fail" ? "text-text-error-primary" : "text-text-tertiary"
            }`}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {canLogin ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void actions.runLogin()}
          className={`h-9 w-full gap-1.5 text-caption-1-medium ${
            phase === "fail" ? "border-border-error-default text-text-error-primary" : ""
          }`}
        >
          <RiLoginBoxLine className="size-3.5 text-text-tertiary" />
          {officialLoginPrimaryLabel(phase === "in" ? "out" : phase, t)}
        </Button>
      ) : null}
    </div>
  )
}
