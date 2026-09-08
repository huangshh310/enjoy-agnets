/**
 * 空态检测 / 缺口清单：ready 品牌行 + missing 安装/复制。
 */
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { DEFAULT_RUNTIME_ID, isEngineReady } from "@renderer/lib/agent-runtime"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "../agent-picker/agent-brand-icon"
import { AgentCliInstall } from "../agent-picker/agent-cli-install"

export function EmptyStateChecklist() {
  const t = useT()
  const tools = (useSettingsSnapshot().data?.agentTools ?? []).filter(
    (item) => item.id !== DEFAULT_RUNTIME_ID && !item.skillOnly && !item.comingSoon
  )
  const ready = tools.filter((item) => isEngineReady(item))
  const missing = tools.filter((item) => item.status === "missing")

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <ChecklistBlock title={t("chat.emptyDetected")}>
        {ready.length === 0 ? (
          <p className="text-caption-1-regular text-text-tertiary">{t("chat.emptyDetectedNone")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {ready.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-caption-1-medium text-text-primary">
                <AgentBrandIcon id={item.id} size={14} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </ChecklistBlock>
      <ChecklistBlock title={t("chat.emptyMissing")}>
        {missing.length === 0 ? (
          <p className="text-caption-1-regular text-text-tertiary">{t("chat.emptyMissingNone")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {missing.map((item) => (
              <MissingRow key={item.id} agent={item} />
            ))}
          </ul>
        )}
      </ChecklistBlock>
    </div>
  )
}

function ChecklistBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-button-default bg-background-secondary-default p-3">
      <h2 className="text-caption-2-medium text-text-tertiary">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function MissingRow({ agent }: { agent: AgentToolPublic }) {
  const queryClient = useQueryClient()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
        <AgentBrandIcon id={agent.id} size={14} />
        <span>{agent.label}</span>
      </div>
      <AgentCliInstall
        agent={agent}
        onDone={() => {
          void queryClient.invalidateQueries({ queryKey: ["settings"] })
        }}
      />
    </div>
  )
}
