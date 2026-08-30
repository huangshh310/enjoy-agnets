/**
 * 供应商基础连接配置：显示名称、协议选择、API Key 凭据以及端点 Base URL。
 */
import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  API_STYLE_OPTIONS,
  type ApiStyle,
  type ProviderPreset
} from "@enjoy-agents/providers/presets"
import { SecretInput } from "../secret-input"
import type { EditorState } from "./providers.types"

export function ProviderConnectionFields({
  editor,
  preset,
  keyHint,
  onChange
}: {
  editor: EditorState
  preset: ProviderPreset
  keyHint?: string
  onChange: (patch: Partial<EditorState>) => void
}) {
  return (
    <div className="flex flex-col gap-4 py-1">
      {/* 基础信息行：显示名称与协议 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Display Name" hint="Friendly profile name">
          <Input
            value={editor.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g. DeepSeek Official"
            className="h-9"
          />
        </Field>

        <Field label="Protocol / Wire API" hint="API format">
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
        label="API Key"
        hint={preset.requiresKey ? "Stored in OS Keychain" : "Optional for local endpoints"}
      >
        <SecretInput
          autoFocus={!editor.id && preset.requiresKey}
          value={editor.apiKey}
          onChange={(value) => onChange({ apiKey: value })}
          placeholder={resolveKeyPlaceholder(editor, preset, keyHint)}
        />
      </Field>

      <Field
        label="Base URL / Endpoint"
        hint="Server address"
      >
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
    </div>
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
  return preset.requiresKey ? "sk-..." : "Optional (e.g. for Ollama)"
}
