/**
 * 仅官方助手的决策槽：只读登录态 + 登录 CTA。禁止假 vault 下拉与「添加供应商档案」链。
 */
import { RiLoginBoxLine } from "@remixicon/react"
import { capabilitiesOf, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import type { AgentToolActions } from "../use-agent-tool-actions"
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
  const parts = powerSourcePartsForTool(tool, { inspecting })
  const canLogin = capabilitiesOf(tool).login && tool.status === "ready"
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border-button-default bg-background-secondary-default/40 px-3 py-2.5">
        <p className="text-caption-1-medium text-text-primary">{formatPowerSourceText(parts, t)}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.officialNoBindHint")}
        </p>
      </div>
      {canLogin ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actions.busyAction === "login"}
          onClick={() => void actions.runLogin()}
          className="h-9 w-full gap-1.5 text-caption-1-medium"
        >
          <RiLoginBoxLine className="size-3.5 text-text-tertiary" />
          {actions.busyAction === "login"
            ? t("settings.agentTools.loggingIn")
            : t("settings.agentTools.officialOpenLogin")}
        </Button>
      ) : null}
    </div>
  )
}
