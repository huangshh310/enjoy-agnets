/**
 * 自动化紧凑列表，不是营销卡。
 */
import type { AgentToolPublic, Automation, AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AutomationRow } from "./automation-row"

export function AutomationList({
  automations,
  missedById,
  tools,
  locale,
  now,
  onOpen,
  onToggle,
  onOpenFailed
}: {
  automations: Automation[]
  missedById: Record<string, AutomationMissedRecord[]>
  tools: AgentToolPublic[]
  locale: string
  now: number
  onOpen: (item: Automation) => void
  onToggle: (item: Automation, enabled: boolean) => void
  onOpenFailed: () => void
}) {
  const t = useT()
  if (automations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-body-medium text-text-primary">{t("studio.automations.emptyTitle")}</p>
        <p className="mt-1 text-caption-1-medium text-text-secondary">{t("studio.automations.emptyHint")}</p>
      </div>
    )
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {automations.map((item) => (
        <AutomationRow
          key={item.id}
          automation={item}
          records={missedById[item.id] ?? []}
          locale={locale}
          now={now}
          engineLabel={engineLabel(item.runtimeId, tools, t)}
          onOpen={() => onOpen(item)}
          onToggle={(enabled) => onToggle(item, enabled)}
          onOpenFailed={onOpenFailed}
        />
      ))}
    </ul>
  )
}

function engineLabel(
  runtimeId: string | undefined,
  tools: AgentToolPublic[],
  t: (key: string) => string
): string {
  const id = runtimeId || "enjoy-local"
  if (id === "enjoy-local") return t("chat.usage.enjoyLocal")
  return tools.find((tool) => tool.id === id)?.label ?? id
}
