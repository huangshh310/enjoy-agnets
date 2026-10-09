/**
 * 引擎显示名字段：设置抽屉与 Picker 重命名共用。空则回退品牌名+模型。
 */
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import { useEngineDisplayNames, useSaveEngineDisplayName } from "@renderer/hooks/use-engine-display-name"
import { DISPLAY_NAME_MAX, normalizeDisplayName } from "@renderer/lib/agent-display-name"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"

export function EngineDisplayNameField({
  runtimeId,
  onSaved
}: {
  runtimeId: string
  onSaved?: () => void
}) {
  const t = useT()
  const names = useEngineDisplayNames()
  const save = useSaveEngineDisplayName()
  const stored = names[runtimeId] ?? ""
  const [value, setValue] = useState(stored)

  useEffect(() => {
    setValue(stored)
  }, [stored])

  async function commit() {
    const next = normalizeDisplayName(value)
    if (next === normalizeDisplayName(stored)) {
      setValue(next)
      return
    }
    setValue(next)
    await save(runtimeId, next)
    onSaved?.()
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption-1-medium text-text-primary">{t("settings.agentTools.engineDisplayName")}</span>
      <Input
        data-testid="engine-display-name"
        value={value}
        maxLength={DISPLAY_NAME_MAX}
        placeholder={t("settings.agentTools.engineDisplayNameHint")}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            void commit()
          }
        }}
      />
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.engineDisplayNameHint")}</p>
      {isDevCopyEnabled() ? (
        <p className="rounded-lg border border-dashed border-border-button-default bg-background-secondary-default/40 px-2.5 py-2 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.engineDisplayNameNote", { id: runtimeId })}
        </p>
      ) : null}
    </label>
  )
}
