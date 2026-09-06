/**
 * 高级配置抽屉：自定义绝对路径与额外参数。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolAdvanced({
  tool,
  actions,
  always = false
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  always?: boolean
}) {
  const t = useT()
  if ((!always && !actions.showAdvanced) || !actions.configurable) return null
  return (
    <div className="mt-2 grid gap-3 rounded-xl border border-border-button-default bg-background-secondary-default/40 p-3.5 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.customPath")}</span>
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
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.extraArgsHint")}</span>
        <Input
          value={actions.args}
          placeholder="--fast"
          onChange={(event) => actions.setArgs(event.target.value)}
          onBlur={() =>
            void actions.persist({
              extraArgs: actions.args
                .split(/\s+/)
                .map((item) => item.trim())
                .filter(Boolean)
            })
          }
          className="font-mono text-caption-1-regular"
        />
      </label>
    </div>
  )
}
