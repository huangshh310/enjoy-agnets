/**
 * 供应商模型配置与目录管理：
 * 1. 默认主力模型（带搜索与远端探测）
 * 2. 角色模型分工（快速模型、推理模型）与推理模式设置
 * 3. 供应商模型目录管理（查看、新增自定义模型、删除）
 */
import { useState } from "react"
import {
  RiBrainLine,
  RiCheckLine,
  RiCloseLine,
  RiDatabase2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import {
  EFFORT_LEVELS,
  getEffortMeta
} from "@renderer/components/ai-chat/reasoning-effort-config"
import { ReasoningEnergyBar } from "@renderer/components/ai-chat/reasoning-energy-bar"
import { ModelBrandIcon } from "./provider-icons"
import { ProviderModelField } from "./provider-model-field"
import type { EditorState, ProbeState } from "./providers.types"
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
  const currentEffortMeta = getEffortMeta(editor.reasoningEffort)

  function addCustomModel() {
    const id = newModelId.trim()
    if (!id) return
    const label = newModelLabel.trim() || id
    if (catalog.some((m) => m.id === id)) return
    const updated = [...catalog, { id, label }]
    onChange({ models: updated })
    setNewModelId("")
    setNewModelLabel("")
  }

  function removeModel(id: string) {
    const updated = catalog.filter((m) => m.id !== id)
    onChange({ models: updated })
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
          apiStyle={editor.apiStyle}
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
              "rounded-full px-2 py-0.5 text-[11px] font-semibold border transition-colors",
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
          {EFFORT_LEVELS.map((opt) => {
            const isSelected = currentEffortMeta.value === opt.value

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ reasoningEffort: opt.effortValue })}
                className={cx(
                  "flex h-7.5 items-center justify-center rounded-lg text-[12px] transition-all outline-none",
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
        <div className="flex items-center justify-between px-0.5 text-[11px]">
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
              placeholder="e.g. gpt-4o-mini, haiku"
              className="h-8.5 font-mono text-[12px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-caption-1-medium text-text-secondary">
              <span>{t("settings.providers.reasoningModel")}</span>
            </div>
            <Input
              value={editor.reasoningModelId ?? ""}
              onChange={(e) => onChange({ reasoningModelId: e.target.value })}
              placeholder="e.g. o1, deepseek-reasoner"
              className="h-8.5 font-mono text-[12px]"
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
            placeholder="Model ID (e.g. qwen-max-latest)"
            className="h-8.5 flex-1 font-mono text-[12px]"
          />
          <Input
            value={newModelLabel}
            onChange={(e) => setNewModelLabel(e.target.value)}
            placeholder="Display Name (Optional)"
            className="h-8.5 flex-1 text-[12px]"
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
        <div className="max-h-40 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-2 flex flex-wrap gap-1.5">
          {catalog.length > 0 ? (
            catalog.map((m) => {
              const isPrimary = editor.modelId === m.id

              return (
                <span
                  key={m.id}
                  className={cx(
                    "group inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-caption-1-medium transition-colors",
                    isPrimary
                      ? "border-accent-500/60 bg-accent-50/80 text-text-primary dark:bg-accent-950/40 ring-1 ring-accent-500/20"
                      : "border-border-button-default bg-background-secondary-default/60 text-text-secondary hover:border-border-button-hover hover:text-text-primary"
                  )}
                >
                  <div className="flex size-4 shrink-0 items-center justify-center">
                    <ModelBrandIcon
                      modelId={m.id}
                      providerKind={editor.kind}
                      apiStyle={editor.apiStyle}
                      size={14}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ modelId: m.id })}
                    className="font-mono text-[11px] font-medium text-left hover:underline cursor-pointer"
                    title={isPrimary ? "Current Primary Model" : "Click to set as Primary Model"}
                  >
                    {m.id}
                  </button>
                  {m.label && m.label !== m.id ? (
                    <span className="text-text-tertiary text-[11px]">({m.label})</span>
                  ) : null}
                  {isPrimary ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-accent-500/15 px-1 py-0.2 text-[9px] font-bold text-accent-600 dark:text-accent-300">
                      <RiCheckLine className="size-2.5" />
                      Primary
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeModel(m.id)}
                    className="size-3.5 rounded text-text-tertiary hover:bg-background-tertiary-default hover:text-text-error-primary inline-flex items-center justify-center transition-colors"
                    title="Remove model from catalog"
                  >
                    <RiCloseLine className="size-3" />
                  </button>
                </span>
              )
            })
          ) : (
            <p className="w-full py-2 text-center text-caption-1-medium text-text-tertiary">
              No models in catalog. Click &quot;Fetch&quot; above to discover models automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
