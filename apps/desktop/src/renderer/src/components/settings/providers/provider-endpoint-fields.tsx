/**
 * 连接页的端点：区域分段、主接口、主地址、另外两条协议、检测。
 * 切主 API 只换展示，不改写用户填过的 URL。
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
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { adviseCatalogUrl, type ApiStyle, type ProviderPreset } from "@enjoy-agents/providers/presets"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { applyRegionSwitch } from "./provider-editor-form"
import { WIRE_STYLES, type EditorState } from "./providers.types"
import { useT } from "@renderer/i18n"

const STYLE_KEY = {
  openai: "styleChat",
  "openai-responses": "styleResponses",
  anthropic: "styleMessages"
} as const

export function ProviderEndpointFields({
  editor,
  preset,
  detecting,
  onChange,
  onDetect
}: {
  editor: EditorState
  preset: ProviderPreset
  detecting: boolean
  onChange: (patch: Partial<EditorState>) => void
  onDetect: () => void
}) {
  const t = useT()
  const others = WIRE_STYLES.filter((style) => style !== editor.baseAPI)
  return (
    <div className="flex flex-col gap-3.5">
      {preset.regions && preset.regions.length > 0 ? (
        <Field label={t(`settings.providers.${preset.regionLabel ?? "region"}`)}>
          <div className="flex flex-wrap gap-1 rounded-xl bg-background-tertiary-default p-1">
            {preset.regions.map((region) => {
              const active = (editor.regionId ?? preset.regions?.[0]?.id) === region.id
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onChange(applyRegionSwitch(editor, preset, region.id))}
                  className={cx(
                    "rounded-lg px-3 py-1 text-caption-1-medium",
                    active
                      ? "bg-background-primary-default text-text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {region.name}
                </button>
              )
            })}
          </div>
        </Field>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Field label={t("settings.providers.primaryApi")} hint={t("settings.providers.primaryApiHint")}>
          <Select value={editor.baseAPI} onValueChange={(value) => onChange({ baseAPI: value as ApiStyle })}>
            <SelectTrigger className="h-9 w-full rounded-2lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SETTINGS_DRAWER_Z_CLASS.float}>
              {WIRE_STYLES.map((style) => (
                <SelectItem key={style} value={style}>
                  {t(`settings.providers.${STYLE_KEY[style]}`)}
                  <span className="ml-1 text-caption-2-regular text-text-secondary">
                    {t(`settings.providers.${STYLE_KEY[style]}Hint`)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <EndpointInput
          label={t("settings.providers.primaryBase")}
          hint={t("settings.providers.primaryBaseHint")}
          style={editor.baseAPI}
          value={editor.endpoints[editor.baseAPI] ?? ""}
          mismatch={Boolean(editor.detectMismatch?.[editor.baseAPI])}
          code={editor.detectCodes?.[editor.baseAPI]}
          onChange={(value) => setEndpoint(editor, editor.baseAPI, value, onChange)}
        />
      </div>

      <Field label={t("settings.providers.otherProtocols")} hint={t("settings.providers.otherProtocolsHint")}>
        <div className="flex flex-col gap-2">
          {others.map((style) => (
            <EndpointInput
              key={style}
              label={t(`settings.providers.${STYLE_KEY[style]}`)}
              hint={t(`settings.providers.${STYLE_KEY[style]}Hint`)}
              style={style}
              value={editor.endpoints[style] ?? ""}
              mismatch={Boolean(editor.detectMismatch?.[style])}
              code={editor.detectCodes?.[style]}
              onChange={(value) => setEndpoint(editor, style, value, onChange)}
            />
          ))}
        </div>
      </Field>

      <Button type="button" variant="outline" size="sm" className="self-start rounded-xl" disabled={detecting} onClick={onDetect}>
        {detecting ? t("settings.providers.detecting") : t("settings.providers.detect")}
      </Button>
    </div>
  )
}

function setEndpoint(
  editor: EditorState,
  style: ApiStyle,
  value: string,
  onChange: (patch: Partial<EditorState>) => void
) {
  const detectMismatch = { ...editor.detectMismatch }
  const detectCodes = { ...editor.detectCodes }
  delete detectMismatch[style]
  delete detectCodes[style]
  onChange({
    endpoints: { ...editor.endpoints, [style]: value },
    detectMismatch,
    detectCodes
  })
}

function EndpointInput({
  label,
  hint,
  style,
  value,
  mismatch,
  code,
  onChange
}: {
  label: string
  hint?: string
  style: ApiStyle
  value: string
  mismatch: boolean
  code?: string
  onChange: (value: string) => void
}) {
  const t = useT()
  const advice = value.trim() ? adviseCatalogUrl(value, style) : { action: "ok" as const }
  return (
    <Field label={label} hint={hint}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t(style === "anthropic" ? "settings.providers.endpointRootHint" : "settings.providers.endpointHint")}
        className="h-9 font-mono text-body-2-regular placeholder:font-sans placeholder:text-text-tertiary"
      />
      {mismatch ? (
        <p className="text-caption-2-medium text-status-yellow-text">{t("settings.providers.detectMismatch")}</p>
      ) : null}
      {code && code !== "detectOk" ? (
        <p className="text-caption-2-medium text-text-tertiary">{t(`settings.providers.${code}`)}</p>
      ) : null}
      {advice.action === "reject" ? (
        <p className="text-pretty text-caption-2-medium text-text-error-primary">
          {t(`settings.providers.${advice.code}`, advice.vars)}
        </p>
      ) : null}
    </Field>
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
      <div className="flex items-center justify-between gap-2">
        <Label className="text-caption-1-medium text-text-secondary">{label}</Label>
        {hint ? <span className="text-caption-1-medium text-text-tertiary">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}
