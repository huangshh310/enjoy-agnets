/**
 * Picker 行「重命名」：与设置抽屉同一字段，写 preferences.agentDisplayNames。
 */
import { useEffect, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useEngineDisplayNames, useSaveEngineDisplayName } from "@renderer/hooks/use-engine-display-name"
import { DISPLAY_NAME_MAX, normalizeDisplayName } from "@renderer/lib/agent-display-name"

export function EngineRenameAction({ runtimeId }: { runtimeId: string }) {
  const t = useT()
  const names = useEngineDisplayNames()
  const save = useSaveEngineDisplayName()
  const stored = names[runtimeId] ?? ""
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(stored)

  useEffect(() => {
    if (open) setValue(stored)
  }, [open, stored])

  async function commit() {
    const next = normalizeDisplayName(value)
    if (next !== normalizeDisplayName(stored)) await save(runtimeId, next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="engine-rename"
          className="rounded-md px-1.5 py-0.5 text-caption-2-medium text-accent-600 outline-none hover:bg-accent-500/10 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {t("chat.renameEngine")}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-[220px] space-y-2 rounded-xl border border-border-button-default bg-background-primary-default p-2.5 shadow-card"
      >
        <p className="text-caption-2-medium text-text-primary">{t("settings.agentTools.engineDisplayName")}</p>
        <Input
          data-testid="engine-rename-input"
          value={value}
          maxLength={DISPLAY_NAME_MAX}
          placeholder={t("settings.agentTools.engineDisplayNameHint")}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void commit()
            }
          }}
        />
        <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.engineDisplayNameHint")}</p>
        <Button type="button" size="sm" className="w-full" onClick={() => void commit()}>
          {t("common.save")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
