/**
 * 供应商模型参数与能力配置：
 * 上下文窗口限制 (Context Window)、推理强度 (Reasoning Effort)、最大输出 Tokens 与采样温度。
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
import { cx } from "@/utils/cx"
import type { EditorState, ReasoningEffort } from "./providers.types"

const CONTEXT_PRESETS = [
  { label: "128K", value: 128000 },
  { label: "200K", value: 200000 },
  { label: "256K", value: 256000 },
  { label: "1M (Claude / Gemini)", value: 1000000 },
  { label: "2M", value: 2000000 }
]

export function ProviderParamsTab({
  editor,
  onChange
}: {
  editor: EditorState
  onChange: (patch: Partial<EditorState>) => void
}) {
  return (
    <div className="flex flex-col gap-4 py-1">
      {/* 上下文窗口限制 */}
      <Field
        label="Context Window Size (Tokens)"
        hint="Max input context length"
      >
        <div className="flex flex-col gap-2">
          <Input
            type="number"
            value={editor.contextWindow ?? 128000}
            onChange={(e) => onChange({ contextWindow: Number(e.target.value) || 0 })}
            placeholder="128000"
            className="h-9 font-mono text-[13px]"
          />
          <div className="flex flex-wrap gap-1.5">
            {CONTEXT_PRESETS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange({ contextWindow: item.value })}
                className={cx(
                  "rounded-md border px-2 py-0.5 text-caption-1-medium transition-colors",
                  editor.contextWindow === item.value
                    ? "border-accent-500/50 bg-accent-50 text-accent-600 font-medium"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Field>

      {/* 推理强度 (针对 o1 / o3 / DeepSeek-R1 等) */}
      <Field
        label="Reasoning Effort"
        hint="Thinking budget for reasoning models"
      >
        <Select
          value={editor.reasoningEffort ?? "none"}
          onValueChange={(val) =>
            onChange({
              reasoningEffort: val === "none" ? undefined : (val as ReasoningEffort)
            })
          }
        >
          <SelectTrigger className="h-9 w-full rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Default / Model Native</SelectItem>
            <SelectItem value="low">Low (Fast)</SelectItem>
            <SelectItem value="medium">Medium (Balanced)</SelectItem>
            <SelectItem value="high">High (Deep reasoning)</SelectItem>
            <SelectItem value="xhigh">X-High / Max (Complex tasks)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* 最大输出 Tokens 与 温度 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Max Output Tokens" hint="Default: 4096">
          <Input
            type="number"
            value={editor.maxTokens ?? 4096}
            onChange={(e) => onChange({ maxTokens: Number(e.target.value) || 0 })}
            placeholder="4096"
            className="h-9 font-mono text-[13px]"
          />
        </Field>

        <Field label="Temperature" hint="0.0 ~ 2.0 (Default: 0.7)">
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={editor.temperature ?? 0.7}
            onChange={(e) => onChange({ temperature: Number(e.target.value) })}
            placeholder="0.7"
            className="h-9 font-mono text-[13px]"
          />
        </Field>
      </div>
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
