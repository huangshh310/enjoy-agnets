/**
 * 供应商高级请求覆盖与参数注入：
 * 1. 自定义请求头 Headers (JSON 代码卡片、快捷模板注入、一键格式化)
 * 2. 自定义请求体 Body 覆盖 (JSON 代码卡片、常用参数模板、一键格式化)
 * 3. 底层预设模板关联与基线能力继承
 */
import { useState } from "react"
import {
  RiBracesLine,
  RiCodeSSlashLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiServerLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import {
  PROVIDER_PRESETS,
  type ProviderKind
} from "@enjoy-agents/providers/presets"
import { ProviderIcon } from "./provider-icons"
import type { EditorState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderOverridesTab({
  editor,
  onChangeKind,
  onChange
}: {
  editor: EditorState
  onChangeKind: (kind: ProviderKind) => void
  onChange: (patch: Partial<EditorState>) => void
}) {
  const t = useT()
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
      const msg = e instanceof Error ? e.message : t("settings.providers.invalidJson")
      if (field === "customHeaders") setHeaderError(msg)
      else setBodyError(msg)
    }
  }

  function insertHeaderTemplate(key: string, value: string) {
    try {
      const current = editor.customHeaders?.trim()
        ? JSON.parse(editor.customHeaders)
        : {}
      current[key] = value
      onChange({ customHeaders: JSON.stringify(current, null, 2) })
      setHeaderError(null)
    } catch {
      onChange({ customHeaders: JSON.stringify({ [key]: value }, null, 2) })
      setHeaderError(null)
    }
  }

  function insertBodyTemplate(key: string, value: unknown) {
    try {
      const current = editor.customBody?.trim()
        ? JSON.parse(editor.customBody)
        : {}
      current[key] = value
      onChange({ customBody: JSON.stringify(current, null, 2) })
      setBodyError(null)
    } catch {
      onChange({ customBody: JSON.stringify({ [key]: value }, null, 2) })
      setBodyError(null)
    }
  }

  const selectedPreset = PROVIDER_PRESETS.find((p) => p.kind === editor.kind)

  return (
    <div className="flex flex-col gap-5 py-1">
      {/* 自定义 HTTP Headers 代码卡片 */}
      <div className="rounded-xl border border-border-button-default bg-background-primary-default overflow-hidden shadow-xs">
        {/* 卡片头部与工具栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <RiBracesLine className="size-4 text-accent-600 shrink-0" />
            <div>
              <span className="text-caption-1-semibold text-text-primary block leading-tight">
                {t("settings.providers.headers")}
              </span>
              <span className="text-[11px] text-text-tertiary">
                {t("settings.providers.headersHint")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => insertHeaderTemplate("X-Title", "Enjoy Agents")}
              className="rounded-md border border-border-button-default/80 bg-background-primary-default px-2 py-0.5 text-[11px] font-medium text-accent-600 hover:border-accent-500/50 hover:bg-accent-50 transition-colors"
            >
              + X-Title
            </button>
            <button
              type="button"
              onClick={() =>
                insertHeaderTemplate("HTTP-Referer", "https://enjoy-agents.ai")
              }
              className="rounded-md border border-border-button-default/80 bg-background-primary-default px-2 py-0.5 text-[11px] font-medium text-accent-600 hover:border-accent-500/50 hover:bg-accent-50 transition-colors"
            >
              + OpenRouter Referer
            </button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => formatJson("customHeaders")}
              disabled={!editor.customHeaders?.trim()}
              className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium"
            >
              {t("settings.providers.format")}
            </Button>
          </div>
        </div>

        {/* Textarea 编辑区 */}
        <div className="p-2.5">
          <Textarea
            value={editor.customHeaders ?? ""}
            onChange={(e) => {
              onChange({ customHeaders: e.target.value })
              setHeaderError(null)
            }}
            placeholder={'{\n  "X-Custom-Provider": "custom-gateway",\n  "User-Agent": "EnjoyAgents/1.0"\n}'}
            rows={4}
            className="font-mono text-[12px] leading-relaxed resize-none border-0 bg-transparent p-1 focus-visible:ring-0 shadow-none text-text-primary placeholder:text-text-placeholder"
          />
        </div>

        {/* 错误提示栏 */}
        {headerError ? (
          <div className="flex items-center gap-1.5 border-t border-state-error-text/20 bg-state-error-text/5 px-3 py-1.5 text-caption-1-medium text-text-error-primary">
            <RiErrorWarningLine className="size-3.5 shrink-0" />
            <span className="truncate">{headerError}</span>
          </div>
        ) : null}
      </div>

      {/* 自定义 Body Overrides 代码卡片 */}
      <div className="rounded-xl border border-border-button-default bg-background-primary-default overflow-hidden shadow-xs">
        {/* 卡片头部与工具栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <RiCodeSSlashLine className="size-4 text-accent-600 shrink-0" />
            <div>
              <span className="text-caption-1-semibold text-text-primary block leading-tight">
                {t("settings.providers.body")}
              </span>
              <span className="text-[11px] text-text-tertiary">
                {t("settings.providers.bodyHint")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => insertBodyTemplate("top_p", 0.9)}
              className="rounded-md border border-border-button-default/80 bg-background-primary-default px-2 py-0.5 text-[11px] font-medium text-accent-600 hover:border-accent-500/50 hover:bg-accent-50 transition-colors"
            >
              + top_p
            </button>
            <button
              type="button"
              onClick={() => insertBodyTemplate("frequency_penalty", 0.2)}
              className="rounded-md border border-border-button-default/80 bg-background-primary-default px-2 py-0.5 text-[11px] font-medium text-accent-600 hover:border-accent-500/50 hover:bg-accent-50 transition-colors"
            >
              + penalty
            </button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => formatJson("customBody")}
              disabled={!editor.customBody?.trim()}
              className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium"
            >
              {t("settings.providers.format")}
            </Button>
          </div>
        </div>

        {/* Textarea 编辑区 */}
        <div className="p-2.5">
          <Textarea
            value={editor.customBody ?? ""}
            onChange={(e) => {
              onChange({ customBody: e.target.value })
              setBodyError(null)
            }}
            placeholder={'{\n  "top_p": 0.9,\n  "frequency_penalty": 0.2\n}'}
            rows={3}
            className="font-mono text-[12px] leading-relaxed resize-none border-0 bg-transparent p-1 focus-visible:ring-0 shadow-none text-text-primary placeholder:text-text-placeholder"
          />
        </div>

        {/* 错误提示栏 */}
        {bodyError ? (
          <div className="flex items-center gap-1.5 border-t border-state-error-text/20 bg-state-error-text/5 px-3 py-1.5 text-caption-1-medium text-text-error-primary">
            <RiErrorWarningLine className="size-3.5 shrink-0" />
            <span className="truncate">{bodyError}</span>
          </div>
        ) : null}
      </div>

      {/* 底层预设参考基准 */}
      <div className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-text-primary">
            <RiServerLine className="size-4 text-accent-500" />
            <span className="text-caption-1-semibold text-text-primary">
              {t("settings.providers.presetRef")}
            </span>
          </div>
          <span className="text-[11px] text-text-tertiary">
            {t("settings.providers.presetHint")}
          </span>
        </div>

        <Select
          value={editor.kind}
          onValueChange={(value) => onChangeKind(value as ProviderKind)}
        >
          <SelectTrigger className="h-9 w-full rounded-xl bg-background-primary-default text-[13px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <ProviderIcon
                  kind={editor.kind}
                  name={editor.name}
                  apiStyle={editor.apiStyle}
                  size={16}
                />
                <span className="font-medium text-text-primary">
                  {selectedPreset?.name ?? editor.kind}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={SETTINGS_DRAWER_Z_CLASS.float}>
            {PROVIDER_PRESETS.map((item) => (
              <SelectItem key={item.kind} value={item.kind}>
                <div className="flex items-center gap-2">
                  <ProviderIcon kind={item.kind} size={16} />
                  <span>{item.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-[11px] text-text-tertiary flex items-center gap-1">
          <RiInformationLine className="size-3 text-text-tertiary shrink-0" />
          <span>{t("settings.providers.presetDesc")}</span>
        </p>
      </div>
    </div>
  )
}
