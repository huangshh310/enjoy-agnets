/**
 * Providers 设置页主入口：
 * 组合已配置 Provider 列表、供应商快捷预设目录与配置编辑弹窗。
 */
import { useMemo } from "react"
import { ProviderCatalog } from "./provider-catalog"
import { ProviderEditorDialog } from "./provider-editor-dialog"
import { ProviderList } from "./provider-list"
import { useProviderSettings } from "./use-provider-settings"

export function ProviderSettings() {
  const settings = useProviderSettings()
  const configuredKinds = useMemo(
    () => new Set(settings.providers.map((profile) => profile.kind)),
    [settings.providers]
  )
  const editingHint = settings.providers.find((item) => item.id === settings.editor?.id)?.keyHint

  return (
    <div className="flex flex-col gap-6">
      {/* 已配置的 Provider 列表（若有） */}
      <ProviderList
        providers={settings.providers}
        onEdit={settings.openEdit}
        onActivate={(id) => void settings.activate(id)}
        onRemove={(id) => void settings.remove(id)}
      />

      {/* 预设与快速添加目录 */}
      <ProviderCatalog
        configuredKinds={configuredKinds}
        hasProviders={settings.providers.length > 0}
        onSelect={settings.openCreate}
      />

      {/* 添加 / 编辑弹层 */}
      <ProviderEditorDialog
        editor={settings.editor}
        preset={settings.preset}
        probe={settings.probe}
        modelChoices={settings.modelChoices}
        keyHint={editingHint}
        canSave={settings.canSave}
        onClose={settings.closeEditor}
        onChangeKind={settings.changeKind}
        onChange={settings.updateEditor}
        onFetchModels={() => void settings.fetchModels()}
        onSave={() => void settings.save(true)}
      />
    </div>
  )
}
