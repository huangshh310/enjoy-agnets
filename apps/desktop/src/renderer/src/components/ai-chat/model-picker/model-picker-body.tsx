/**
 * 双栏模型列表：左供应商、右模型。设置默认模型与 Agent 选择器共用。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import type { ModelOption } from "@renderer/stores/chat-store"
import { groupModelsByProvider } from "./group-models"
import { ModelListPane } from "./model-list-pane"
import { ProviderSidebar } from "./provider-sidebar"

export function ModelPickerBody({
  modelId,
  models,
  onSelectModel
}: {
  modelId: string
  models: ModelOption[]
  onSelectModel: (model: ModelOption) => void
}) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedKey, setSelectedKey] = useState("all")
  const experimentalMedia = useSettingsSnapshot().data?.preferences.experimentalMedia ?? false
  const groups = useMemo(() => groupModelsByProvider(models), [models])
  const current = models.find((model) => model.id === modelId)

  useEffect(() => {
    if (current?.providerId) {
      setSelectedKey(current.providerId)
      return
    }
    if (current?.provider) {
      const match = groups.find((group) => group.provider === current.provider)
      setSelectedKey(match?.key ?? groups[0]?.key ?? "all")
      return
    }
    setSelectedKey(groups.find((group) => group.active)?.key ?? groups[0]?.key ?? "all")
  }, [current, groups])

  function manageProviders() {
    void navigate({ to: "/settings/$section", params: { section: "providers" } })
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ProviderSidebar
        groups={groups}
        selectedKey={selectedKey}
        totalModelsCount={models.length}
        onSelectKey={setSelectedKey}
        onManageProviders={manageProviders}
      />
      <ModelListPane
        selectedKey={selectedKey}
        groups={groups}
        currentModelId={modelId}
        currentProviderId={current?.providerId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectModel={onSelectModel}
        onManageProviders={manageProviders}
        experimentalMedia={experimentalMedia}
      />
    </div>
  )
}
