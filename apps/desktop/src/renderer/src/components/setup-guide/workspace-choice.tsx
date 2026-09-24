/**
 * 工作区页：虚线落区点按打开文件夹，下面可以填路径再添加。
 */
import { useState, type DragEvent } from "react"
import { RiFolder3Line, RiFolderAddLine } from "@remixicon/react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { loadWorkspace, type WorkspaceRow } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function WorkspaceChoice({
  name,
  onOpened
}: {
  name: string
  onOpened: (name: string) => void
}) {
  const t = useT()
  const [path, setPath] = useState("")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [over, setOver] = useState(false)
  const open = (nextPath?: string) => void openWorkspacePath(nextPath, setBusy, setFailed, onOpened, () => setPath(""))
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <FolderDrop busy={busy} over={over} setOver={setOver} onOpen={open} hint={t("settings.setupGuide.dropHint")} browse={t("settings.setupGuide.browse")} opening={t("settings.setupGuide.opening")} />
      <PathRow path={path} busy={busy} onPath={setPath} onAdd={() => open(path.trim())} label={t("settings.setupGuide.pathLabel")} placeholder={folderPathHint()} add={t("settings.setupGuide.add")} />
      {name ? <p className="text-[13px] text-text-secondary">{t("settings.setupGuide.opened", { name })}</p> : null}
      {failed ? <p className="text-[13px] text-state-error-text">{t("settings.setupGuide.openFailed")}</p> : null}
    </div>
  )
}

function FolderDrop({
  busy,
  over,
  setOver,
  onOpen,
  hint,
  browse,
  opening
}: {
  busy: boolean
  over: boolean
  setOver: (over: boolean) => void
  onOpen: (path?: string) => void
  hint: string
  browse: string
  opening: string
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onOpen()}
      onDragOver={(event) => keepDrop(event, setOver)}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        const dropped = droppedPath(event)
        if (dropped) onOpen(dropped)
      }}
      className={cx(
        "flex min-h-[168px] w-full flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-text-primary/20 text-[15px] text-text-primary hover:bg-text-primary/[0.03] disabled:opacity-50",
        over && "border-solid border-accent-500 bg-text-primary/5"
      )}
    >
      <RiFolderAddLine className="size-[22px] text-text-primary/70" aria-hidden />
      <span>
        {busy ? opening : hint}{" "}
        {busy ? null : <span className="underline decoration-dotted decoration-[1.5px] underline-offset-[5px]">{browse}</span>}
      </span>
    </button>
  )
}

function PathRow({
  path,
  busy,
  onPath,
  onAdd,
  label,
  placeholder,
  add
}: {
  path: string
  busy: boolean
  onPath: (value: string) => void
  onAdd: () => void
  label: string
  placeholder: string
  add: string
}) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (path.trim()) onAdd()
      }}
    >
      <label className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-text-primary/15">
        <span className="flex w-10 items-center justify-center border-r border-text-primary/15">
          <RiFolder3Line className="size-4 text-text-tertiary" aria-hidden />
        </span>
        <input
          value={path}
          onChange={(event) => onPath(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[14px] text-text-primary outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={busy || path.trim().length === 0}
        className="h-9 shrink-0 cursor-pointer rounded-lg border border-text-primary/15 px-4 text-[14px] text-text-primary disabled:opacity-40"
      >
        {add}
      </button>
    </form>
  )
}

/** Windows 用盘符示例，其它系统用家目录。不要写死一种路径。 */
function folderPathHint(): string {
  if (typeof navigator !== "undefined" && /Win/i.test(navigator.platform)) return "C:\\project"
  return "~/project"
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

async function openWorkspacePath(
  nextPath: string | undefined,
  setBusy: (busy: boolean) => void,
  setFailed: (failed: boolean) => void,
  onOpened: (name: string) => void,
  clearPath: () => void
): Promise<void> {
  if (!hasIde()) return
  setBusy(true)
  setFailed(false)
  try {
    const workspace = (await getIde().workspace.open(nextPath ? { path: nextPath } : {})) as WorkspaceRow
    await loadWorkspace(workspace)
    onOpened(workspace.name)
    clearPath()
  } catch {
    setFailed(true)
  } finally {
    setBusy(false)
  }
}
