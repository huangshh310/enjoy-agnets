/**
 * 已配置行的操作。开启时行上是「使用」和「编辑」。
 * 关闭时主按钮是「开启」，溢出菜单不再重复这一项。
 */
import { RiDeleteBinLine, RiEditLine, RiFileCopyLine, RiLoader4Line, RiMoreLine, RiPulseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import type { PingStateMap } from "./use-provider-settings"
import { useT } from "@renderer/i18n"

export function ProviderRowActions({
  profile,
  pingState,
  onPing,
  onEdit,
  onActivate,
  onRemove,
  onDuplicate,
  onSetEnabled
}: {
  profile: ProviderPublic
  pingState?: PingStateMap[string]
  onPing?: () => void
  onEdit: () => void
  onActivate: () => void
  onRemove: () => void
  onDuplicate: () => void
  onSetEnabled: (enabled: boolean) => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <PrimaryAction profile={profile} onActivate={onActivate} onSetEnabled={onSetEnabled} />
      <Button type="button" variant="outline" size="sm" onClick={onEdit} className="h-7 rounded-lg px-2 text-caption-1-medium">
        <RiEditLine className="mr-1 size-3.5" />
        {t("settings.providers.edit")}
      </Button>
      <RowOverflow
        profile={profile}
        pingState={pingState}
        onPing={onPing}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onSetEnabled={onSetEnabled}
      />
    </div>
  )
}

/** 关闭档案时先开启。已开启才提供使用。 */
function PrimaryAction({
  profile,
  onActivate,
  onSetEnabled
}: {
  profile: ProviderPublic
  onActivate: () => void
  onSetEnabled: (enabled: boolean) => void
}) {
  const t = useT()
  if (!profile.enabled) {
    return (
      <Button type="button" size="sm" onClick={() => onSetEnabled(true)} className="h-7 rounded-lg px-2.5 text-caption-1-medium">
        {t("settings.providers.enable")}
      </Button>
    )
  }
  const inUse = Boolean(profile.active)
  return (
    <Button
      type="button"
      variant={inUse ? "ghost" : "outline"}
      size="sm"
      onClick={onActivate}
      disabled={inUse}
      className="h-7 rounded-lg px-2.5 text-caption-1-medium"
    >
      {inUse ? t("settings.providers.inUse") : t("settings.providers.use")}
    </Button>
  )
}

function RowOverflow({
  profile,
  pingState,
  onPing,
  onRemove,
  onDuplicate,
  onSetEnabled
}: {
  profile: ProviderPublic
  pingState?: PingStateMap[string]
  onPing?: () => void
  onRemove: () => void
  onDuplicate: () => void
  onSetEnabled: (enabled: boolean) => void
}) {
  const t = useT()
  const pending = pingState?.status === "pending"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0 text-text-tertiary" aria-label={t("settings.providers.moreActions")}>
          <RiMoreLine className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {onPing ? (
          <DropdownMenuItem disabled={pending} onClick={onPing}>
            {pending ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiPulseLine className="size-3.5" />}
            {t("settings.providers.speedTest")}
          </DropdownMenuItem>
        ) : null}
        {profile.enabled ? (
          <DropdownMenuItem onClick={() => onSetEnabled(false)}>
            {t("settings.providers.disable")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onDuplicate}>
          <RiFileCopyLine className="size-3.5" />
          {t("settings.providers.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onRemove}>
          <RiDeleteBinLine className="size-3.5" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
