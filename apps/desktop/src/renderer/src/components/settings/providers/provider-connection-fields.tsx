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
  adviseCatalogUrl,
  API_STYLE_OPTIONS,
  type ApiStyle,
  type ProviderPreset
} from "@enjoy-agents/providers/presets"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { SecretInput } from "../secret-input"
import type { EditorState } from "./providers.types"
import { useT, type TranslateFn } from "@renderer/i18n"

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
  const t = useT()
  return (
    <div className="flex flex-col gap-4 py-1">
      {/* 基础信息行：显示名称与协议 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label={t("settings.providers.displayName")} hint={t("settings.providers.displayHint")}>
          <Input
            value={editor.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder={t("settings.providers.namePlaceholder")}
            className="h-9"
          />
        </Field>

        <Field label={t("settings.providers.protocol")} hint={t("settings.providers.protocolHint")}>
          <Select
            value={editor.apiStyle}
            onValueChange={(value) => onChange({ apiStyle: value as ApiStyle })}
          >
            <SelectTrigger className="h-9 w-full rounded-2lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SETTINGS_DRAWER_Z_CLASS.float}>
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
        label={t("settings.providers.apiKey")}
        hint={preset.requiresKey ? t("settings.providers.keychain") : t("settings.providers.optionalLocal")}
      >
        <SecretInput
          autoFocus={!editor.id && preset.requiresKey}
          value={editor.apiKey}
          onChange={(value) => onChange({ apiKey: value })}
          placeholder={resolveKeyPlaceholder(editor, preset, keyHint, t)}
        />
      </Field>

      <Field label={t("settings.providers.baseUrl")} hint={t("settings.providers.serverAddress")}>
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
        <CatalogUrlHint baseURL={editor.baseURL} apiStyle={editor.apiStyle} />
      </Field>
    </div>
  )
}

/** 填了控制台网页或协议对不上时，不用等点「拉取」才知道。 */
function CatalogUrlHint({ baseURL, apiStyle }: { baseURL: string; apiStyle: ApiStyle }) {
  const t = useT()
  const advice = adviseCatalogUrl(baseURL, apiStyle)
  if (advice.action !== "reject") return null
  return (
    <p className="text-pretty text-caption-2-medium text-text-error-primary">
      {t(`settings.providers.${advice.code}`, advice.vars)}
    </p>
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
  keyHint: string | undefined,
  t: TranslateFn
) {
  if (editor.id) return keyHint || t("settings.providers.keepKey")
  return preset.requiresKey ? "sk-..." : t("settings.providers.optionalOllama")
}
