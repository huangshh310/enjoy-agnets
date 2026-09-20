/**
 * 引擎胶囊：复用 Composer 导轨名单，不新 runtime。
 */
import { cx } from "@/utils/cx"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { composerRailSections } from "@renderer/components/ai-chat/agent-picker/composer-agents"
import { useT } from "@renderer/i18n"

export function EnginePills({
  tools,
  value,
  onChange
}: {
  tools: AgentToolPublic[]
  value: string
  onChange: (runtimeId: string) => void
}) {
  const t = useT()
  const { local, cli } = composerRailSections(tools)
  const options = [...local, ...cli]
  return (
    <div>
      <p className="text-caption-1-medium text-text-tertiary">{t("studio.automations.engine")}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((tool) => {
          const selected = value === tool.id
          const label = tool.id === "enjoy-local" ? t("chat.usage.enjoyLocal") : tool.label
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onChange(tool.id)}
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption-1-medium ring-1",
                selected
                  ? "bg-accent-500/10 ring-accent-500/30 text-text-primary"
                  : "bg-background-secondary-default ring-border-button-default text-text-secondary"
              )}
            >
              <AgentBrandIcon id={tool.id} className="size-3.5" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
