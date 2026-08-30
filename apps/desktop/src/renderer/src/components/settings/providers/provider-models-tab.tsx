/**
 * 供应商模型配置与目录管理：
 * 1. 默认主力模型（带搜索与远端探测）
 * 2. 角色模型分工（快速模型、推理模型）
 * 3. 供应商模型目录管理（查看、新增自定义模型、删除）
 */
import { useState } from "react"
import {
  RiAddLine,
  RiBrainLine,
  RiCloseLine,
  RiDatabase2Line,
  RiFlashlightLine,
  RiRobot2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProviderModelField } from "./provider-model-field"
import type { EditorState, ProbeState } from "./providers.types"

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
  const [newModelId, setNewModelId] = useState("")
  const [newModelLabel, setNewModelLabel] = useState("")

  const catalog = editor.models ?? []

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
          <RiRobot2Line className="size-4 text-accent-500" />
          <span className="text-body-medium font-medium">Primary / Default Model</span>
        </div>
        <ProviderModelField
          modelId={editor.modelId}
          choices={modelChoices}
          probe={probe}
          onChange={(modelId) => onChange({ modelId })}
          onFetch={onFetchModels}
        />
      </div>

      {/* 辅助角色分工模型 */}
      <div className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5 flex flex-col gap-3">
        <span className="text-caption-1-semibold text-text-secondary">
          Role-Based Model Mapping (Optional)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-caption-1-medium text-text-secondary">
              <RiFlashlightLine className="size-3.5 text-accent-600" />
              <span>Fast / Lightweight Model</span>
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
              <RiBrainLine className="size-3.5 text-accent-600" />
              <span>Reasoning / Heavy Model</span>
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
              Provider Model Catalog ({catalog.length})
            </span>
          </div>
          <span className="text-caption-1-medium text-text-tertiary">
            Fetched or predefined models
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
            <RiAddLine className="size-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* 已录入模型列表展示 */}
        <div className="max-h-36 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-2 flex flex-wrap gap-1.5">
          {catalog.length > 0 ? (
            catalog.map((m) => (
              <span
                key={m.id}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default/60 px-2 py-1 text-caption-1-medium text-text-secondary transition-colors hover:border-border-button-hover hover:text-text-primary"
              >
                <span className="font-mono text-[11px] font-medium">{m.id}</span>
                {m.label && m.label !== m.id ? (
                  <span className="text-text-tertiary text-[11px]">({m.label})</span>
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
            ))
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
