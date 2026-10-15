/**
 * 一把档案上的 Key 列表。空输入表示保存时保留 vault 里同一 id 的旧值。
 */
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { isApiStyle, type ApiStyle } from "@enjoy-agents/providers/presets"
import { SecretInput } from "../secret-input"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { blankKey, type EditorKey, type EditorState } from "./providers.types"
import { useT } from "@renderer/i18n"

const ANY = "any"

export function ProviderKeyList({
  editor,
  onChange
}: {
  editor: EditorState
  onChange: (patch: Partial<EditorState>) => void
}) {
  const t = useT()
  const patchKey = (id: string, patch: Partial<EditorKey>) => {
    onChange({
      keys: editor.keys.map((key) => (key.id === id ? { ...key, ...patch } : key))
    })
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption-1-medium text-text-secondary">{t("settings.providers.apiKey")}</span>
      {editor.keys.map((key, index) => (
        <div key={key.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border-button-default p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_140px_auto]">
          <Input
            value={key.name}
            onChange={(event) => patchKey(key.id, { name: event.target.value })}
            placeholder={t("settings.providers.keyLabel")}
            aria-label={t("settings.providers.keyLabel")}
            className="h-9"
          />
          <SecretInput
            value={key.apiKey}
            onChange={(value) => patchKey(key.id, { apiKey: value })}
            placeholder={key.keyHint || (key.hasKey ? t("settings.providers.keepKey") : "sk-...")}
            id={index === 0 ? "provider-key-input" : undefined}
          />
          <Select
            value={key.apiStyle ?? ANY}
            onValueChange={(value) => patchKey(key.id, { apiStyle: value === ANY || !isApiStyle(value) ? undefined : value as ApiStyle })}
          >
            <SelectTrigger className="h-9 w-full rounded-2lg" aria-label={t("settings.providers.keyProtocolLock")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SETTINGS_DRAWER_Z_CLASS.float}>
              <SelectItem value={ANY}>{t("settings.providers.keyAnyProtocol")}</SelectItem>
              <SelectItem value="openai">{t("settings.providers.styleChat")}</SelectItem>
              <SelectItem value="openai-responses">{t("settings.providers.styleResponses")}</SelectItem>
              <SelectItem value="anthropic">{t("settings.providers.styleMessages")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={key.enabled}
              onClick={() => patchKey(key.id, { enabled: !key.enabled })}
              className="rounded-lg border border-border-button-default px-2 py-1 text-caption-2-medium text-text-secondary"
            >
              {key.enabled ? t("settings.providers.keyEnabled") : t("settings.providers.disable")}
            </button>
            {editor.keys.length > 1 ? (
              <button
                type="button"
                aria-label={t("settings.providers.deleteAria", { name: key.name || key.id })}
                onClick={() => onChange({ keys: editor.keys.filter((item) => item.id !== key.id) })}
                className="inline-flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-error-primary"
              >
                <RiDeleteBinLine className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start rounded-xl"
        onClick={() => onChange({ keys: [...editor.keys, blankKey()] })}
      >
        <RiAddLine className="mr-1 size-3.5" />
        {t("settings.providers.addKey")}
      </Button>
    </div>
  )
}
