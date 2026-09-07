/**
 * 更新内容对话框：版本、发行说明、下载进度。点立即更新只负责开始下载。
 * 下完由 main quitAndInstall；UI 在 ready 再调 install 是幂等兜底，不要第三次确认。
 */
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useAppUpdateStore } from "@renderer/stores/app-update-store"
import { UPDATE_CTA_CLASS } from "./constants"

export function AppUpdateDialog() {
  const t = useT()
  const snapshot = useAppUpdateStore((state) => state.snapshot)
  const open = useAppUpdateStore((state) => state.dialogOpen)
  const setDialogOpen = useAppUpdateStore((state) => state.setDialogOpen)
  const downloading = snapshot.status === "downloading"
  const installing = snapshot.status === "ready"
  const canDownload = snapshot.status === "available"

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {t("settings.update.promptTitle", { version: snapshot.version ?? snapshot.currentVersion })}
          </DialogTitle>
          <DialogDescription className="text-caption-1-medium text-text-secondary">
            {t("settings.update.promptDesc", { current: snapshot.currentVersion })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-border-button-default bg-background-secondary-default p-3">
          <p className="mb-2 text-caption-2-medium text-text-tertiary">{t("settings.update.notesTitle")}</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-caption-1-regular text-text-primary">
            {snapshot.releaseNotes?.trim() || t("settings.update.notesEmpty")}
          </pre>
        </div>
        {downloading || installing ? <DownloadBar percent={snapshot.percent ?? (installing ? 100 : 0)} /> : null}
        {snapshot.status === "error" && snapshot.error ? (
          <p className="mt-3 text-caption-1-medium text-text-error-primary">{snapshot.error}</p>
        ) : null}
        <DialogFooter className="mt-5 gap-2">
          <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
            {t("settings.update.later")}
          </Button>
          <Button
            type="button"
            disabled={!canDownload}
            className={UPDATE_CTA_CLASS}
            onClick={() => void getIde().app.downloadUpdate({})}
          >
            {installing
              ? t("settings.update.install")
              : downloading
                ? t("settings.update.downloadingShort")
                : t("settings.update.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DownloadBar({ percent }: { percent: number }) {
  const t = useT()
  return (
    <div className="mt-3">
      <p className="mb-1 text-caption-2-medium text-text-secondary">
        {t("settings.update.downloading", { percent })}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
        <div className="h-full rounded-full bg-accent-500 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
