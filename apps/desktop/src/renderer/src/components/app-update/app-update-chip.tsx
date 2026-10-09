/**
 * 标题栏「有更新」芯片。点开发行说明对话框。必须 no-drag，否则无边框标题栏点不中。
 */
import { useT } from "@renderer/i18n"
import { useAppUpdateStore } from "@renderer/stores/app-update-store"
import { UPDATE_CTA_CLASS } from "./constants"
import { showsUpdateChip } from "./update-prompt"

export function AppUpdateChip() {
  const t = useT()
  const status = useAppUpdateStore((state) => state.snapshot.status)
  const percent = useAppUpdateStore((state) => state.snapshot.percent)
  const setDialogOpen = useAppUpdateStore((state) => state.setDialogOpen)
  if (!showsUpdateChip(status)) return null
  const label =
    status === "downloading"
      ? t("settings.update.downloading", { percent: Math.round(percent ?? 0) })
      : t("settings.update.availableChip")
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        setDialogOpen(true)
      }}
      className={`mr-1 flex h-6 cursor-pointer items-center whitespace-nowrap rounded-md px-2 text-caption-2-medium transition-colors ${UPDATE_CTA_CLASS}`}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      {label}
    </button>
  )
}
