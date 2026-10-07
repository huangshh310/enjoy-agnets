/**
 * Composer 溢出菜单里的「选取窗口」。最多 50 个，只贴图，不发、不操控。
 */
import { useState } from "react"
import type { AppsnapWindow } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

export function AppsnapWindowPicker() {
  const t = useT()
  if (typeof navigator !== "undefined" && !/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) {
    return null
  }
  const [open, setOpen] = useState(false)
  const [windows, setWindows] = useState<AppsnapWindow[]>([])
  const [line, setLine] = useState("")

  async function load() {
    if (!hasIde()) return
    const next = !open
    setOpen(next)
    if (!next) return
    const result = (await getIde().appsnap.listWindows()) as { ok?: boolean; windows?: AppsnapWindow[]; line?: string }
    setWindows(result.windows ?? [])
    setLine(result.ok ? "" : result.line ?? "")
  }

  async function pick(window: AppsnapWindow) {
    if (!window.capturable || !hasIde()) return
    setOpen(false)
    await getIde().appsnap.capture({ windowId: window.id })
  }

  return (
    <div className="mt-1.5 border-t border-separator-border/60 pt-1.5">
      <button
        type="button"
        className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-caption-1-medium text-text-primary hover:bg-background-secondary-hover"
        onClick={() => void load()}
      >
        {t("chat.appsnapPick")}
      </button>
      {open ? (
        <div className="max-h-64 overflow-auto">
          {line ? <p className="px-2 py-1 text-caption-2-medium text-text-tertiary">{line}</p> : null}
          {windows.map((window) => (
            <button
              key={window.id}
              type="button"
              disabled={!window.capturable}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-background-secondary-hover disabled:opacity-40"
              onClick={() => void pick(window)}
            >
              {window.iconPngBase64 ? (
                <img alt="" className="size-4" src={`data:image/png;base64,${window.iconPngBase64}`} />
              ) : (
                <span className="size-4 rounded bg-background-secondary-default" />
              )}
              <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
                {window.title || window.appName}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
