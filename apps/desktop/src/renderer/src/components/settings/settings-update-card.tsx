/**
 * 设置 → 通用：当前版本与检查更新。有新版本时打开发行说明对话框。
 */
import { Button } from "@/components/ui/button"
import { parseAppUpdateSnapshot, type AppUpdateSnapshot } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { useT, type TranslateFn } from "@renderer/i18n"
import { useAppUpdateStore } from "@renderer/stores/app-update-store"
import { UPDATE_CTA_CLASS } from "../app-update/constants"
import { SettingsCard, SettingsRow } from "./settings-row"

export function SettingsUpdateCard() {
  const t = useT()
  const snapshot = useAppUpdateStore((state) => state.snapshot)
  const setDialogOpen = useAppUpdateStore((state) => state.setDialogOpen)
  const setSnapshot = useAppUpdateStore((state) => state.setSnapshot)
  const version = snapshot.currentVersion || t("settings.update.unknownVersion")
  const checking = snapshot.status === "checking"
  const hasPrompt = snapshot.status === "available" || snapshot.status === "ready"

  return (
    <SettingsCard title={t("settings.update.title")}>
      <SettingsRow
        title={t("settings.update.current")}
        description={`${t("settings.update.currentDesc", { version })} · ${statusLabel(snapshot, t)}`}
      >
        {hasPrompt ? (
          <Button type="button" className={`rounded-2lg ${UPDATE_CTA_CLASS}`} onClick={() => setDialogOpen(true)}>
            {t("settings.update.availableChip")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={checking}
            className="rounded-2lg"
            onClick={() => void checkNow(setSnapshot, setDialogOpen)}
          >
            {checking ? t("settings.update.checking") : t("settings.update.check")}
          </Button>
        )}
      </SettingsRow>
    </SettingsCard>
  )
}

/** 把快照状态翻成设置行说明，缺键时回落到 idle。 */
function statusLabel(snapshot: AppUpdateSnapshot, t: TranslateFn): string {
  if (snapshot.status === "available") {
    return t("settings.update.available", { version: snapshot.version ?? "" })
  }
  if (snapshot.status === "up-to-date") return t("settings.update.upToDate")
  if (snapshot.status === "dev") return t("settings.update.devSkip")
  if (snapshot.status === "error") return snapshot.error || t("settings.update.error")
  if (snapshot.status === "downloading") return t("settings.update.downloading", { percent: snapshot.percent ?? 0 })
  if (snapshot.status === "ready") return t("settings.update.install")
  if (snapshot.status === "checking") return t("settings.update.checking")
  return t("settings.update.idle")
}

/** 用户点「检查更新」才打 GitHub；有新版本直接打开说明。 */
async function checkNow(
  setSnapshot: (snapshot: AppUpdateSnapshot) => void,
  setDialogOpen: (open: boolean) => void
) {
  const parsed = parseAppUpdateSnapshot(await getIde().app.checkUpdate({}))
  if (!parsed) return
  setSnapshot(parsed)
  if (parsed.status === "available" || parsed.status === "ready") setDialogOpen(true)
}
