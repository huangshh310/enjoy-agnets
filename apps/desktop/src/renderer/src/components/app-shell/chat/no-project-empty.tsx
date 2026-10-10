/**
 * 无项目主区：说明在钮上面，中等主操作，可拖入文件夹。不替用户弹系统窗。
 */
import { useState, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { loadWorkspace, type WorkspaceRow } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useNoProjectNudge } from "./no-project-nudge"

export function NoProjectEmpty() {
  const t = useT()
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const nudge = useNoProjectNudge((state) => state.on)

  async function open(path?: string) {
    if (!hasIde()) return
    setBusy(true)
    try {
      const workspace = (await getIde().workspace.open(path ? { path } : {})) as WorkspaceRow
      await loadWorkspace(workspace)
    } catch {
      // 用户取消选夹不算错
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-testid="no-project-empty"
      onDragOver={(event) => keepDrop(event, setOver)}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        const dropped = droppedPath(event)
        if (dropped) void open(dropped)
      }}
      className={cx(
        "flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center",
        over && "bg-text-primary/5"
      )}
    >
      <p className="max-w-sm text-body-medium text-text-secondary">{t("chat.noProjectEmpty")}</p>
      {nudge ? (
        <p data-testid="no-project-new-chat-hint" className="max-w-sm text-caption-1-medium text-text-secondary">
          {t("chat.noProjectNewChatHint")}
        </p>
      ) : null}
      <span className={cx("rounded-xl p-1", nudge && "bg-accent-500/10")}>
        <Button
          type="button"
          data-testid="no-project-select-folder"
          className="h-9"
          disabled={busy}
          onClick={() => {
            useNoProjectNudge.getState().clear()
            void open()
          }}
        >
          {t("chat.selectFolder")}
        </Button>
      </span>
    </div>
  )
}

function keepDrop(event: DragEvent, setOver: (over: boolean) => void): void {
  event.preventDefault()
  setOver(true)
}

function droppedPath(event: DragEvent): string {
  event.preventDefault()
  const file = event.dataTransfer.files[0] as File & { path?: string }
  return file?.path ?? ""
}
