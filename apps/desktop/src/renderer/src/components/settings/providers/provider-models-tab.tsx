/**
 * 供应商模型配置与目录管理：
 * 1. 默认主力模型（带搜索与远端探测）
 * 2. 角色模型分工（快速模型、推理模型）与推理模式设置
 * 3. 供应商模型目录管理（查看、新增自定义模型、删除）
 */
import { useState } from "react"
import {
  RiBrainLine,
  RiDatabase2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { getEffortLevels, getEffortMeta } from "@renderer/components/ai-chat/reasoning-effort-config"
import { ReasoningEnergyBar } from "@renderer/components/ai-chat/reasoning-energy-bar"
import { ProviderModelField } from "./provider-model-field"
import { ProviderModelRow } from "./provider-model-row"
import type { EditorModel, EditorState, ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderModelsTab({
  editor,
  modelChoices,
  probe,
  onChange,
  onFetchModels
}: {
  editor: EditorState
  modelChoices: Array<{ id: string; label: string }>
  probe: ProbeState
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
}) {
  const t = useT()
  const [newModelId, setNewModelId] = useState("")
  const [newModelLabel, setNewModelLabel] = useState("")

  const catalog = editor.models ?? []
  const effortLevels = getEffortLevels(t)
  const currentEffortMeta = getEffortMeta(editor.reasoningEffort, t)

  function addCustomModel() {
    const id = newModelId.trim()
    if (!id) return
    const label = newModelLabel.trim() || id
    if (catalog.some((m) => m.id === id)) return
    const updated = [...catalog, { id, label, enabled: true, source: "manual" as const }]
    onChange({ models: updated })
    setNewModelId("")
    setNewModelLabel("")
  }

  function patchModel(id: string, patch: Partial<EditorModel>) {
    onChange({ models: catalog.map((model) => (model.id === id ? { ...model, ...patch } : model)) })
  }

  return (
    <div className="flex flex-col gap-5 py-1">
      {/* 默认主力模型 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-text-primary">
          <span className="text-body-medium font-medium">{t("settings.providers.primary")}</span>
        </div>
        <ProviderModelField
          modelId={editor.modelId}
          choices={modelChoices}
          probe={probe}
          providerKind={editor.kind}
          apiStyle={editor.baseAPI}
          onChange={(modelId) => onChange({ modelId })}
          onFetch={onFetchModels}
        />
      </div>

      {/* 推理模式与思考能量条 (Reasoning Mode & Thinking Energy Gauge) */}
      <div
        className={cx(
          "rounded-xl border p-3.5 transition-all flex flex-col gap-3",
          "border-border-button-default/80 bg-background-secondary-default/30"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiBrainLine
              className={cx(
                "size-4",
                currentEffortMeta.iconColorClass
              )}
            />
            <span className="text-caption-1-semibold text-text-primary">
              {t("settings.providers.reasoningMode")}
            </span>
          </div>
          <span
            className={cx(
              "rounded-full px-2 py-0.5 text-caption-2-semibold font-semibold border transition-colors",
              currentEffortMeta.badgeClass
            )}
          >
            {t("settings.providers.levelWithShort", {
              index: currentEffortMeta.index,
              label: currentEffortMeta.label,
              short: currentEffortMeta.shortLabel
            })}
          </span>
        </div>

        {/* 交互式思考能量滑块条 (Interactive Energy Bar) */}
        <div className="px-1 py-0.5">
          <ReasoningEnergyBar
            value={editor.reasoningEffort}
            onChange={(effort) => onChange({ reasoningEffort: effort })}
            size="md"
            showLabels={false}
          />
        </div>

        {/* 5 档分段控制胶囊 (Segmented Control Buttons) */}
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-border-button-default bg-background-tertiary-default/60 p-1">
          {effortLevels.map((opt) => {
            const isSelected = currentEffortMeta.value === opt.value

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ reasoningEffort: opt.effortValue })}
                className={cx(
                  "flex h-7.5 items-center justify-center rounded-lg text-caption-1-regular transition-all outline-none",
                  isSelected
                    ? "bg-background-primary-default text-text-primary font-semibold shadow-xs border border-border-button-default/60"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover/50"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* 当前档位描述文字 */}
        <div className="flex items-center justify-between px-0.5 text-caption-2-regular">
          <span className="text-text-secondary">
            {t("settings.providers.thinkingDepth")}{" "}
            <span className="font-medium text-text-primary">{currentEffortMeta.label}</span>
          </span>
          <span className="text-text-tertiary">{currentEffortMeta.desc}</span>
        </div>
      </div>

      {/* 辅助角色分工模型 */}
      <div className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5 flex flex-col gap-3">
        <span className="text-caption-1-semibold text-text-secondary">
          {t("settings.providers.roleMapping")}
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-caption-1-medium text-text-secondary">
              <span>{t("settings.providers.fastModel")}</span>
            </div>
            <Input
              value={editor.fastModelId ?? ""}
              onChange={(e) => onChange({ fastModelId: e.target.value })}
              placeholder={t("settings.providers.fastPlaceholder")}
              className="h-8.5 font-mono text-caption-1-regular"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-caption-1-medium text-text-secondary">
              <span>{t("settings.providers.reasoningModel")}</span>
            </div>
            <Input
              value={editor.reasoningModelId ?? ""}
              onChange={(e) => onChange({ reasoningModelId: e.target.value })}
              placeholder={t("settings.providers.reasoningPlaceholder")}
              className="h-8.5 font-mono text-caption-1-regular"
            />
          </div>
        </div>
      </div>

      {/* 供应商内置模型目录管理 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-text-primary">
            <RiDatabase2Line className="size-4 text-accent-500" />
            <span className="text-body-medium font-medium">
              {t("settings.providers.catalog", { count: catalog.length })}
            </span>
          </div>
          <span className="text-caption-1-medium text-text-tertiary">
            {t("settings.providers.catalogHint")}
          </span>
        </div>

        {/* 添加自定义模型输入条 */}
        <div className="flex items-center gap-2">
          <Input
            value={newModelId}
            onChange={(e) => setNewModelId(e.target.value)}
            placeholder={t("settings.providers.modelIdPlaceholder")}
            className="h-8.5 flex-1 font-mono text-caption-1-regular"
          />
          <Input
            value={newModelLabel}
            onChange={(e) => setNewModelLabel(e.target.value)}
            placeholder={t("settings.providers.displayOptional")}
            className="h-8.5 flex-1 text-caption-1-regular"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomModel}
            disabled={!newModelId.trim()}
            className="shrink-0"
          >
            {t("settings.providers.add")}
          </Button>
        </div>

        {/* 已录入模型列表展示 */}
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {catalog.length > 0 ? (
            catalog.map((model) => (
              <ProviderModelRow
                key={model.id}
                model={model}
                kind={editor.kind}
                apiStyle={editor.baseAPI}
                isPrimary={editor.modelId === model.id}
                onPatch={(patch) => patchModel(model.id, patch)}
                onPrimary={() => onChange({ modelId: model.id })}
                onDelete={() => onChange({ models: catalog.filter((item) => item.id !== model.id) })}
              />
            ))
          ) : (
            <p className="w-full py-2 text-center text-caption-1-medium text-text-tertiary">
              {t("settings.providers.catalogEmpty")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
