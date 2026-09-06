/**
 * Providers 设置页主入口：
 * 采用双视图 Tabbed 架构解耦“已配置服务商 (Configured)”与“预设市场 (Explore Presets)”，
 * 保证配置项和预设增多时交互整洁、层次分明。
 */
import { useMemo, useState } from "react"
import { RiCompass3Line, RiServerLine, RiStackLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"
import { ProviderConfiguredTab } from "./provider-configured-tab"
import { ProviderEditorDialog } from "./provider-editor-dialog"
import { ProviderPresetsTab } from "./provider-presets-tab"
import { useProviderSettings } from "./use-provider-settings"
import { useT } from "@renderer/i18n"

export function ProviderSettings() {
  const t = useT()
  const settings = useProviderSettings()
  const [activeTab, setActiveTab] = useState<"configured" | "presets">("configured")

  const configuredKinds = useMemo(
    () => new Set(settings.providers.map((profile) => profile.kind)),
    [settings.providers]
  )
  const editingHint = settings.providers.find((item) => item.id === settings.editor?.id)?.keyHint

  const totalPresetsCount = useMemo(
    () => PROVIDER_PRESETS.filter((p) => p.kind !== "custom").length,
    []
  )

  function handleSelectPreset(kind: ProviderKind, apiStyle: ApiStyle) {
    settings.openCreate(kind, apiStyle)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {/* 顶部标题与多视图 Segmented 控制栏 */}
      <div className="flex shrink-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title-2-semibold text-text-primary">{t("nav.providers")}</h1>
          <p className="mt-0.5 text-caption-1-medium text-text-secondary">
            {t("settings.providers.subtitle")}
          </p>
        </div>

        {/* 顶部操作区 */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Segmented View Tabs */}
          <div className="flex items-center rounded-xl bg-background-tertiary-default p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("configured")}
              className={cx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-1-medium transition-all outline-none",
                activeTab === "configured"
                  ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover/50"
              )}
            >
              <RiStackLine className="size-3.5" />
              <span>{t("settings.providers.configured")}</span>
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  activeTab === "configured"
                    ? "bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300"
                    : "bg-background-secondary-default text-text-tertiary"
                )}
              >
                {settings.providers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={cx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-1-medium transition-all outline-none",
                activeTab === "presets"
                  ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover/50"
              )}
            >
              <RiCompass3Line className="size-3.5" />
              <span>{t("settings.providers.explore")}</span>
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  activeTab === "presets"
                    ? "bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300"
                    : "bg-background-secondary-default text-text-tertiary"
                )}
              >
                {totalPresetsCount}
              </span>
            </button>
          </div>

          {/* 快捷添加自定义端点 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectPreset("custom", "openai")}
            className="rounded-xl border-border-button-default bg-background-primary-default hidden md:inline-flex"
          >
            <RiServerLine className="size-3.5 mr-1 text-accent-500" />
            {t("settings.providers.customV1")}
          </Button>
        </div>
      </div>

      {/* 视图内容区：空态铺满剩余高度，预设市场仍随内容滚动 */}
      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "configured" ? (
          <ProviderConfiguredTab
            providers={settings.providers}
            pingStates={settings.pingStates}
            onPing={settings.testProviderPing}
            onPingAll={settings.pingAllProviders}
            onEdit={settings.openEdit}
            onActivate={(id) => void settings.activate(id)}
            onRemove={(id) => void settings.remove(id)}
            onAddCustom={handleSelectPreset}
            onExplorePresets={() => setActiveTab("presets")}
          />
        ) : (
          <ProviderPresetsTab
            configuredKinds={configuredKinds}
            onSelect={handleSelectPreset}
          />
        )}
      </div>

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
