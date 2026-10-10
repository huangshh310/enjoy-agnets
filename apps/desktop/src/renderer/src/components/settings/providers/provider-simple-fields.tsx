/**
 * 向导 / 去连接的添加表单：先贴密钥（必要时选模型），端点与协议收进「高级」。
 */
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { SecretInput } from "../secret-input"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { ProviderConnectionFields } from "./provider-connection-fields"
import type { EditorState, ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderSimpleFields({
  editor,
  preset,
  modelChoices,
  detecting,
  onChange,
  onDetect
}: {
  editor: EditorState
  preset: ProviderPreset
  modelChoices: Array<{ id: string; label: string }>
  probe?: ProbeState
  detecting: boolean
  onChange: (patch: Partial<EditorState>) => void
  onDetect: () => void
}) {
  const t = useT()
  const key = editor.keys[0]
  return (
    <div data-testid="provider-simple-fields" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.apiKey")}</Label>
        {key ? (
          <SecretInput
            value={key.apiKey}
            onChange={(value) =>
              onChange({ keys: editor.keys.map((item) => (item.id === key.id ? { ...item, apiKey: value } : item)) })
            }
            placeholder={key.keyHint || "sk-..."}
          />
        ) : null}
      </div>
      {preset.requiresKey || modelChoices.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.primary")}</Label>
          {modelChoices.length > 0 ? (
            <Select value={editor.modelId} onValueChange={(value) => onChange({ modelId: value })}>
              <SelectTrigger className="h-9 w-full rounded-2lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SETTINGS_DRAWER_Z_CLASS.float}>
                {modelChoices.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={editor.modelId}
              onChange={(event) => onChange({ modelId: event.target.value })}
              placeholder={t("settings.providers.modelId")}
              className="h-9"
            />
          )}
        </div>
      ) : null}
      <details className="rounded-xl border border-border-button-default px-3 py-2">
        <summary className="cursor-pointer text-caption-1-medium text-text-secondary">
          {t("settings.providers.simpleAdvanced")}
        </summary>
        <div className="mt-3">
          <ProviderConnectionFields
            editor={editor}
            preset={preset}
            detecting={detecting}
            onChange={onChange}
            onDetect={onDetect}
          />
        </div>
      </details>
    </div>
  )
}
