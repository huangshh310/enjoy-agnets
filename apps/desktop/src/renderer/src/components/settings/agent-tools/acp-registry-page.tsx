/**
 * 设置 → 智能体 → Registry：内置目录 + 自定义 ACP 表单。不上 EngineRail。
 */
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { AcpRegistryDetail } from "./acp-registry-detail"
import { AcpRegistryList } from "./acp-registry-list"
import { registryRows } from "./acp-registry.types"
import { CustomAcpAgentForm } from "./custom-acp-agent-form"

export function AcpRegistryPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const rows = useMemo(() => registryRows(tools), [tools])
  const [selectedId, setSelectedId] = useState(rows[0]?.tool.id)
  const selected = rows.find((row) => row.tool.id === selectedId) ?? rows[0]

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.registry.title")}</h3>
        <p className="mt-0.5 text-caption-1-regular text-text-secondary">{t("settings.registry.desc")}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <AcpRegistryList rows={rows} selectedId={selected?.tool.id} onSelect={setSelectedId} />
        <AcpRegistryDetail row={selected} onInstalled={refresh} />
      </div>
      <section className="rounded-xl border border-border-button-default bg-background-primary-default p-4">
        <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.registry.addCustom")}</h3>
        <p className="mt-0.5 mb-3 text-caption-1-regular text-text-secondary">{t("settings.registry.addCustomDesc")}</p>
        <CustomAcpAgentForm onSaved={refresh} />
      </section>
    </section>
  )
}
