/**
 * 供应商编辑/添加表单字段组：
 * 结构清晰分为核心配置（名称、协议、密钥、端点、模型）与高级选项。
 */
import { useEffect, useState, type ReactNode } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { cx } from "@/utils/cx"
import {
  API_STYLE_OPTIONS,
  PROVIDER_PRESETS,
  type ApiStyle,
  type ProviderKind,
  type ProviderPreset
} from "@enjoy-agents/providers/presets"
import { SecretInput } from "../secret-input"
import { ProviderModelField } from "./provider-model-field"
import type { EditorState, ProbeState } from "./providers.types"

export function ProviderEditorFields({
  editor,
  preset,
  keyHint,
  modelChoices,
  probe,
  onChangeKind,
  onChange,
  onFetchModels
}: {
  editor: EditorState
  preset: ProviderPreset
  keyHint?: string
  modelChoices: Array<{ id: string; label: string }>
  probe: ProbeState
  onChangeKind: (kind: ProviderKind) => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
}) {
  const [advancedOpen, setAdvancedOpen] = useState(editor.kind === "custom")

  useEffect(() => {
    if (editor.kind === "custom") setAdvancedOpen(true)
  }, [editor.kind])

  return (
    <div className="flex flex-col gap-4">
      {/* 基础信息行：显示名称与协议 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Display name">
          <Input
            value={editor.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g. DeepSeek Official"
            className="h-9"
          />
        </Field>

        <Field label="Protocol">
          <Select
            value={editor.apiStyle}
            onValueChange={(value) => onChange({ apiStyle: value as ApiStyle })}
          >
            <SelectTrigger className="h-9 w-full rounded-2lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {API_STYLE_OPTIONS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* 密钥与端点 */}
      <Field
        label="API key"
        hint={preset.requiresKey ? "Required" : "Optional for local endpoints"}
      >
        <SecretInput
          autoFocus={!editor.id && preset.requiresKey}
          value={editor.apiKey}
          onChange={(value) => onChange({ apiKey: value })}
          placeholder={resolveKeyPlaceholder(editor, preset, keyHint)}
        />
      </Field>

      <Field label="Base URL">
        <Input
          value={editor.baseURL}
          onChange={(event) => onChange({ baseURL: event.target.value })}
          placeholder={
            editor.apiStyle === "anthropic"
              ? "https://api.anthropic.com"
              : "https://api.example.com/v1"
          }
          className="h-9 font-mono text-[13px]"
        />
      </Field>

      {/* 模型选择与远端抓取 */}
      <ProviderModelField
        modelId={editor.modelId}
        choices={modelChoices}
        probe={probe}
        onChange={(modelId) => onChange({ modelId })}
        onFetch={onFetchModels}
      />

      {/* 高级选项（底模预设切换等） */}
      <AdvancedFields
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        editor={editor}
        onChangeKind={onChangeKind}
      />
    </div>
  )
}

function AdvancedFields({
  open,
  onOpenChange,
  editor,
  onChangeKind
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: EditorState
  onChangeKind: (kind: ProviderKind) => void
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="pt-1">
      <CollapsibleTrigger
        type="button"
        className="flex items-center gap-1.5 text-caption-1-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span>Advanced Settings</span>
        <RiArrowDownSLine
          className={cx("size-4 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-xl border border-border-button-default/60 bg-background-secondary-default/40 p-3.5">
        <Field label="Underlying Preset Template">
          <Select
            value={editor.kind}
            onValueChange={(value) => onChangeKind(value as ProviderKind)}
          >
            <SelectTrigger className="h-9 w-full rounded-2lg bg-background-primary-default">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_PRESETS.map((item) => (
                <SelectItem key={item.kind} value={item.kind}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-caption-1-medium text-text-secondary">{label}</Label>
        {hint ? (
          <span className="text-caption-1-medium text-text-tertiary">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function resolveKeyPlaceholder(
  editor: EditorState,
  preset: ProviderPreset,
  keyHint?: string
) {
  if (editor.id) return keyHint || "Keep existing key or paste new one"
  return preset.requiresKey ? "Paste API key (sk-...)" : "Optional (e.g. for Ollama)"
}
