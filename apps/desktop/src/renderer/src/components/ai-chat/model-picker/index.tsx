/**
 * 双栏多供应商模型选择器 (Dual-pane Model Picker) 主组件：
 * 左栏提供供应商分组与状态切换，右栏提供全量模型搜索与一键切换。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import {
  type ProviderGroup,
  formatProviderTitle
} from "./model-picker-types"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { ModelListPane } from "./model-list-pane"
import { ProviderSidebar } from "./provider-sidebar"
import { useT } from "@renderer/i18n"

export function ModelPicker({
  modelId,
  modelLabel,
  models,
  onModelChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedKey, setSelectedKey] = useState<string>("all")
  const navigate = useNavigate()
  const experimentalMedia = useSettingsSnapshot().data?.preferences.experimentalMedia ?? false

  // 打开弹层时静默刷新最新供应商与模型列表，确保多供应商状态实时同步
  useEffect(() => {
    if (open && hasIde()) {
      void getIde().models.list().then((res) => {
        if (!Array.isArray(res)) return
        const listed = res as ModelOption[]
        const store = useChatStore.getState()
        store.setModels(listed)
        if (listed.length === 0) store.setModel("", "")
      })
    }
  }, [open])

  const currentModel = useMemo(() => {
    return models.find((m) => m.id === modelId)
  }, [models, modelId])

  // 按已配置的供应商组织模型列表
  const groupedProviders = useMemo(() => {
    const groups = new Map<string, ProviderGroup>()

    for (const m of models) {
      const key = m.providerId || m.provider || "default"
      const existing = groups.get(key)
      if (existing) {
        if (!existing.models.some((item) => item.id === m.id)) {
          existing.models.push(m)
        }
      } else {
        groups.set(key, {
          key,
          provider: m.provider,
          providerId: m.providerId,
          providerName: m.providerName || formatProviderTitle(m.provider),
          apiStyle: m.apiStyle,
          active: m.active,
          models: [m]
        })
      }
    }

    return Array.from(groups.values())
  }, [models])

  // 打开弹层时，智能初始化选中的供应商
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      if (currentModel?.providerId) {
        setSelectedKey(currentModel.providerId)
      } else if (currentModel?.provider) {
        const match = groupedProviders.find((g) => g.provider === currentModel.provider)
        setSelectedKey(match ? match.key : groupedProviders[0]?.key || "all")
      } else {
        const activeGroup = groupedProviders.find((g) => g.active)
        setSelectedKey(activeGroup ? activeGroup.key : groupedProviders[0]?.key || "all")
      }
    }
  }, [open, currentModel, groupedProviders])

  function handleSelectModel(model: ModelOption) {
    onModelChange(model)
    setOpen(false)
  }

  function handleManageProviders() {
    setOpen(false)
    void navigate({ to: "/settings/$section", params: { section: "providers" } })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.selectModel")}
          className="group flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2 text-body-medium text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring @[26rem]:px-2.5"
        >
          <div className="flex size-4.5 shrink-0 items-center justify-center">
            <ModelBrandIcon
              modelId={modelId}
              providerKind={currentModel?.provider}
              apiStyle={currentModel?.apiStyle}
              size={15}
            />
          </div>
          <span className="min-w-0 max-w-[5.5rem] truncate text-caption-1-medium text-text-primary">
            {models.length > 0 ? modelLabel || modelId : t("chat.selectModel")}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex w-[520px] sm:w-[560px] h-[380px] p-0 rounded-2xl border border-border-button-default bg-background-primary-default shadow-card overflow-hidden"
      >
        {/* 左栏：供应商侧边栏 */}
        <ProviderSidebar
          groups={groupedProviders}
          selectedKey={selectedKey}
          totalModelsCount={models.length}
          onSelectKey={setSelectedKey}
          onManageProviders={handleManageProviders}
        />

        {/* 右栏：模型搜索与选择列表 */}
        <ModelListPane
          selectedKey={selectedKey}
          groups={groupedProviders}
          currentModelId={modelId}
          currentProviderId={currentModel?.providerId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectModel={handleSelectModel}
          onManageProviders={handleManageProviders}
          experimentalMedia={experimentalMedia}
        />
      </PopoverContent>
    </Popover>
  )
}
