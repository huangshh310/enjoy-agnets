/**
 * 高级：CLI 安装位置，以及未被收录的自定义启动项。
 */
import { useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import { decodeLaunchArgs } from "./launch-prefs/args"
import { AgentToolCustomArgs } from "./launch-prefs/custom-args"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolAdvanced({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const leftover = decodeLaunchArgs(tool.id, tool.extraArgs ?? []).custom.length
  const [open, setOpen] = useState(leftover > 0)
  if (!actions.configurable) return null
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-lg px-0.5 py-1 text-caption-2-medium text-text-tertiary hover:text-text-secondary"
      >
        <span>
          {t("settings.agentTools.advanced")}
          {leftover > 0 ? ` · ${t("settings.agentTools.customArgsCount", { count: leftover })}` : ""}
        </span>
        <RiArrowDownSLine className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="grid gap-3 rounded-xl border border-border-button-default bg-background-secondary-default/40 p-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.customPath")}</span>
            <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.customPathHint")}</p>
            <div className="flex gap-2">
              <Input
                value={actions.path}
                placeholder={tool.detectedPath ?? "/usr/local/bin/claude"}
                onChange={(event) => actions.setPath(event.target.value)}
                className="font-mono text-caption-1-regular"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void actions.persist({ binaryPath: actions.path.trim() })}
              >
                {t("settings.agentTools.savePath")}
              </Button>
            </div>
          </label>
          <AgentToolCustomArgs tool={tool} actions={actions} />
        </div>
      ) : null}
    </div>
  )
}
