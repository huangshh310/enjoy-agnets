/**
 * 请求覆盖：请求头用键值行，区标是钥匙而不是花括号。
 * Body 仍是 JSON。预设身份在创建时确定，这里不再改 kind。
 */
import { useState } from "react"
import { RiCodeSSlashLine, RiErrorWarningLine, RiKeyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { ProviderHeaderRows } from "./provider-header-rows"
import type { EditorState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderOverridesTab({
  editor,
  preset,
  onChange
}: {
  editor: EditorState
  preset: ProviderPreset
  onChange: (patch: Partial<EditorState>) => void
}) {
  const t = useT()
  const [bodyError, setBodyError] = useState<string | null>(null)

  function insertBodyTemplate(key: string, value: unknown) {
    try {
      const current = editor.customBody?.trim() ? JSON.parse(editor.customBody) as Record<string, unknown> : {}
      current[key] = value
      onChange({ customBody: JSON.stringify(current, null, 2) })
      setBodyError(null)
    } catch {
      onChange({ customBody: JSON.stringify({ [key]: value }, null, 2) })
      setBodyError(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 py-1">
      <section className="overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default shadow-xs">
        <div className="flex items-center gap-2 border-b border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5">
          <RiKeyLine className="size-4 shrink-0 text-accent-600" />
          <div>
            <span className="block text-caption-1-semibold text-text-primary">{t("settings.providers.headers")}</span>
            <span className="text-caption-2-regular text-text-tertiary">{t("settings.providers.headersHint")}</span>
          </div>
        </div>
        <ProviderHeaderRows
          value={editor.customHeaders}
          hints={preset.headerHints}
          onChange={(customHeaders) => onChange({ customHeaders })}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border bg-background-secondary-default/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <RiCodeSSlashLine className="size-4 shrink-0 text-accent-600" />
            <div>
              <span className="block text-caption-1-semibold text-text-primary">{t("settings.providers.body")}</span>
              <span className="text-caption-2-regular text-text-tertiary">{t("settings.providers.bodyHint")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => insertBodyTemplate("top_p", 0.9)} className="rounded-md border border-border-button-default px-2 py-0.5 text-caption-2-medium text-accent-600">
              + top_p
            </button>
            <Button type="button" size="xs" variant="outline" onClick={() => formatBody(editor.customBody, onChange, setBodyError, t("settings.providers.invalidJson"))}>
              {t("settings.providers.format")}
            </Button>
          </div>
        </div>
        <div className="p-2.5">
          <Textarea
            value={editor.customBody ?? ""}
            onChange={(event) => {
              onChange({ customBody: event.target.value })
              setBodyError(null)
            }}
            rows={3}
            className="resize-none border-0 bg-transparent p-1 font-mono text-caption-1-regular shadow-none focus-visible:ring-0"
          />
        </div>
        {bodyError ? (
          <div className="flex items-center gap-1.5 border-t border-border-error-default/20 px-3 py-1.5 text-caption-1-medium text-text-error-primary">
            <RiErrorWarningLine className="size-3.5 shrink-0" />
            <span className="truncate">{bodyError}</span>
          </div>
        ) : null}
      </section>

      {editor.kind !== "custom" ? (
        <p className="text-caption-2-regular text-text-tertiary">{t("settings.providers.presetFixed")}</p>
      ) : null}
    </div>
  )
}

function formatBody(
  raw: string | undefined,
  onChange: (patch: Partial<EditorState>) => void,
  setError: (message: string | null) => void,
  invalid: string
) {
  if (!raw?.trim()) return
  try {
    onChange({ customBody: JSON.stringify(JSON.parse(raw), null, 2) })
    setError(null)
  } catch (error) {
    setError(error instanceof Error ? error.message : invalid)
  }
}
