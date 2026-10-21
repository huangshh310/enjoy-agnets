/**
 * 向导 / 去连接的添加表单：先贴密钥（必要时选模型），端点与协议收进「高级」。
 * 自定义端点的名称是必填、没有预设名：放在表单最上面露着，缺的时候「起个名字才能保存。」就在它下面（luna #170 r-luna ③）；
 * 预设自带名称，仍收在「高级」里。
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
import { ProviderConnectionFields, ProviderNameField } from "./provider-connection-fields"
import { MissingFieldHint } from "./provider-missing-hint"
import { simpleNameUpFront, type EditorMissingField, type EditorState, type ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderSimpleFields({
  editor,
  preset,
  modelChoices,
  detecting,
  onChange,
  onDetect,
  focusKey = false,
  missing
}: {
  editor: EditorState
  preset: ProviderPreset
  modelChoices: Array<{ id: string; label: string }>
  probe?: ProbeState
  detecting: boolean
  onChange: (patch: Partial<EditorState>) => void
  onDetect: () => void
  focusKey?: boolean
  missing?: readonly EditorMissingField[]
}) {
  const t = useT()
  const key = editor.keys[0]
  const nameUpFront = simpleNameUpFront(editor.kind)
  return (
    <div data-testid="provider-simple-fields" className="flex flex-col gap-4">
      {nameUpFront ? <ProviderNameField editor={editor} onChange={onChange} missing={missing} /> : null}
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.apiKey")}</Label>
        {key ? (
          <SecretInput
            value={key.apiKey}
            onChange={(value) =>
              onChange({ keys: editor.keys.map((item) => (item.id === key.id ? { ...item, apiKey: value } : item)) })
            }
            placeholder={key.keyHint || "sk-..."}
            autoFocus={focusKey}
            id="provider-key-input"
          />
        ) : null}
        <MissingFieldHint missing={missing} field="key" />
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
          <MissingFieldHint missing={missing} field="model" />
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
            // 密钥、模型（自定义端点还有名称）在上面已经各有一行提示，「高级」里只提剩下的名称 / 接口地址。
            missing={missing?.filter((field) => (field === "name" && !nameUpFront) || field === "endpoint")}
            showName={!nameUpFront}
          />
        </div>
      </details>
    </div>
  )
}
