/**
 * Providers 设置页主入口：
 * 采用双视图 Tabbed 架构解耦“已配置服务商 (Configured)”与“预设市场 (Explore Presets)”，
 * 保证配置项和预设增多时交互整洁、层次分明。
 */
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { RiCompass3Line, RiStackLine } from "@remixicon/react"
import { agentRefsForProvider } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { ProviderConfiguredTab } from "./provider-configured-tab"
import { ProviderEditorDrawer } from "./provider-editor-drawer"
import { ProviderPresetsTab } from "./provider-presets-tab"
import { useProviderSettings } from "./use-provider-settings"
import { useT } from "@renderer/i18n"
import { joinSegments } from "@renderer/lib/join-segments"

export function ProviderSettings() {
  const t = useT()
  const navigate = useNavigate()
  const settings = useProviderSettings()
  const agentTools = useSettingsSnapshot().data?.agentTools ?? []
  const [activeTab, setActiveTab] = useState<"configured" | "presets">("configured")
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string; agents: string } | null>(
    null
  )
  const refsByProvider = useMemo(() => {
    const map: Record<string, ReturnType<typeof agentRefsForProvider>> = {}
    for (const profile of settings.providers) {
      const refs = agentRefsForProvider(profile.id, agentTools)
      if (refs.length > 0) map[profile.id] = refs
    }
    return map
  }, [settings.providers, agentTools])

  const configuredKinds = useMemo(
    () => new Set(settings.providers.map((profile) => profile.kind)),
    [settings.providers]
  )
  const totalPresetsCount = useMemo(
    () => PROVIDER_PRESETS.filter((p) => p.kind !== "custom").length,
    []
  )

  function handleSelectPreset(kind: ProviderKind, apiStyle: ApiStyle) {
    settings.openCreate(kind, apiStyle)
  }

  function openAgent(runtimeId: string) {
    settings.closeEditor()
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tool: runtimeId }
    })
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
                  "rounded-full px-1.5 py-0.2 text-caption-2-bold font-bold",
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
                  "rounded-full px-1.5 py-0.2 text-caption-2-bold font-bold",
                  activeTab === "presets"
                    ? "bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300"
                    : "bg-background-secondary-default text-text-tertiary"
                )}
              >
                {totalPresetsCount}
              </span>
            </button>
          </div>
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
            onDuplicate={(profile) => void settings.duplicate(profile)}
            onSetEnabled={(id, enabled) => void settings.setEnabled(id, enabled)}
            onRemove={(id) => {
              const profile = settings.providers.find((item) => item.id === id)
              const refs = refsByProvider[id] ?? []
              if (refs.length > 0 && profile) {
                setPendingRemove({
                  id,
                  name: profile.name,
                  agents: joinSegments(...refs.map((item) => item.label))
                })
                return
              }
              void settings.remove(id)
            }}
            onAddCustom={handleSelectPreset}
            onExplorePresets={() => setActiveTab("presets")}
            refsByProvider={refsByProvider}
            onOpenAgent={openAgent}
          />
        ) : (
          <ProviderPresetsTab
            configuredKinds={configuredKinds}
            onSelect={handleSelectPreset}
          />
        )}
      </div>

      <ProviderEditorDrawer
        editor={settings.editor}
        preset={settings.preset}
        probe={settings.probe}
        modelChoices={settings.modelChoices}
        refs={settings.editor?.id ? refsByProvider[settings.editor.id] : undefined}
        canSave={settings.canSave}
        detecting={settings.detecting}
        onClose={settings.closeEditor}
        onChange={settings.updateEditor}
        onFetchModels={() => void settings.fetchModels()}
        onDetect={() => void settings.detect()}
        onSave={() => void settings.save(true)}
        onOpenAgent={openAgent}
      />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title={t("settings.providers.removeBoundTitle", { name: pendingRemove?.name ?? "" })}
        description={t("settings.providers.removeBoundDesc", { agents: pendingRemove?.agents ?? "" })}
        confirmLabel={t("common.delete")}
        destructive
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        onConfirm={() => {
          const id = pendingRemove?.id
          if (id) void settings.remove(id)
        }}
      />
    </div>
  )
}
