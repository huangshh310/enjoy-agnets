/**
 * 供应商高级请求覆盖：
 * 1. 自定义请求头 Headers (JSON)
 * 2. 自定义请求体 Body 覆盖 (JSON)
 * 3. 底层预设模板关联切换
 */
import { useState, type ReactNode } from "react"
import { RiCodeSSlashLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  PROVIDER_PRESETS,
  type ProviderKind
} from "@enjoy-agents/providers/presets"
import type { EditorState } from "./providers.types"

export function ProviderOverridesTab({
  editor,
  onChangeKind,
  onChange
}: {
  editor: EditorState
  onChangeKind: (kind: ProviderKind) => void
  onChange: (patch: Partial<EditorState>) => void
}) {
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)

  function formatJson(field: "customHeaders" | "customBody") {
    const raw = editor[field]?.trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const formatted = JSON.stringify(parsed, null, 2)
      onChange({ [field]: formatted })
      if (field === "customHeaders") setHeaderError(null)
      else setBodyError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON"
      if (field === "customHeaders") setHeaderError(msg)
      else setBodyError(msg)
    }
  }

  function insertHeaderTemplate(key: string, value: string) {
    try {
      const current = editor.customHeaders?.trim() ? JSON.parse(editor.customHeaders) : {}
      current[key] = value
      onChange({ customHeaders: JSON.stringify(current, null, 2) })
      setHeaderError(null)
    } catch {
      onChange({ customHeaders: JSON.stringify({ [key]: value }, null, 2) })
      setHeaderError(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 py-1">
      {/* 自定义 Headers 注入 */}
      <Field
        label="Custom HTTP Headers (JSON)"
        hint="Injected into upstream API requests"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => insertHeaderTemplate("X-Title", "Enjoy Agents")}
              className="text-caption-1-medium text-accent-600 hover:underline"
            >
              + X-Title
            </button>
            <button
              type="button"
              onClick={() => insertHeaderTemplate("HTTP-Referer", "https://enjoy-agents.ai")}
              className="text-caption-1-medium text-accent-600 hover:underline"
            >
              + OpenRouter Referer
            </button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => formatJson("customHeaders")}
              className="h-6 gap-1 px-2 text-caption-1-medium"
            >
              <RiCodeSSlashLine className="size-3" />
              Format
            </Button>
          </div>
        }
      >
        <Textarea
          value={editor.customHeaders ?? ""}
          onChange={(e) => {
            onChange({ customHeaders: e.target.value })
            setHeaderError(null)
          }}
          placeholder={'{\n  "X-Custom-Provider": "custom-gateway",\n  "User-Agent": "EnjoyAgents/1.0"\n}'}
          rows={4}
          className="font-mono text-[12px] bg-background-primary-default"
        />
        {headerError ? (
          <p className="text-caption-1-medium text-text-error-primary">{headerError}</p>
        ) : null}
      </Field>

      {/* 自定义 Body 参数覆盖 */}
      <Field
        label="Custom Body Overrides (JSON)"
        hint="Additional request body parameters"
        action={
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => formatJson("customBody")}
            className="h-6 gap-1 px-2 text-caption-1-medium"
          >
            <RiCodeSSlashLine className="size-3" />
            Format
          </Button>
        }
      >
        <Textarea
          value={editor.customBody ?? ""}
          onChange={(e) => {
            onChange({ customBody: e.target.value })
            setBodyError(null)
          }}
          placeholder={'{\n  "top_p": 0.9,\n  "frequency_penalty": 0.2\n}'}
          rows={3}
          className="font-mono text-[12px] bg-background-primary-default"
        />
        {bodyError ? (
          <p className="text-caption-1-medium text-text-error-primary">{bodyError}</p>
        ) : null}
      </Field>

      {/* 底层预设模板关联 */}
      <Field
        label="Underlying Preset Reference"
        hint="Used for default documentation and baseline configurations"
      >
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
    </div>
  )
}

function Field({
  label,
  hint,
  action,
  children
}: {
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-caption-1-medium text-text-secondary">{label}</Label>
          {hint ? (
            <span className="text-caption-1-medium text-text-tertiary">({hint})</span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
