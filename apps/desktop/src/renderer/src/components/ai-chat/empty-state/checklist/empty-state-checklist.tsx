/**
 * 空态检测 / 缺口清单：ready 单行 + missing 单 CTA。禁止嵌 AgentCliInstall。
 */
import type { ReactNode } from "react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "../../agent-picker/agent-brand-icon"
import { splitEmptyStateTools } from "./empty-state-checklist-model"
import { EmptyStateMissingRow } from "./empty-state-missing-row"

export function EmptyStateChecklist() {
  const t = useT()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const { ready, missing } = splitEmptyStateTools(tools)

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <ChecklistBlock title={t("chat.emptyDetected")}>
        {ready.length === 0 ? (
          <p className="text-caption-1-regular text-text-tertiary">{t("chat.emptyDetectedNone")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ready.map((item) => (
              <li key={item.id} className="flex min-h-7 items-center gap-2 text-caption-1-medium text-text-primary">
                <AgentBrandIcon id={item.id} size={14} />
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </ChecklistBlock>
      <ChecklistBlock title={t("chat.emptyMissing")}>
        {missing.length === 0 ? (
          <p className="text-caption-1-regular text-text-tertiary">{t("chat.emptyMissingNone")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {missing.map((item) => (
              <EmptyStateMissingRow key={item.id} agent={item} />
            ))}
          </ul>
        )}
      </ChecklistBlock>
    </div>
  )
}

function ChecklistBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="h-auto rounded-2xl border border-border-button-default bg-background-secondary-default px-3 py-2">
      <h2 className="text-caption-2-medium text-text-tertiary">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}
