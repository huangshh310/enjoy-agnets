/**
 * 监视工作区文件变化，推给渲染进程刷新树。
 * Windows 大目录 fs.watch 会漏，另开指纹轮询补一刀。
 */
import { watch, type FSWatcher } from "node:fs"
import { BrowserWindow } from "electron"
import { getWorkspace } from "./workspace"
import { shouldPollWorkspaceWatch, workspaceFingerprint } from "./workspace-watch-fingerprint.ts"

const watchers = new Map<string, FSWatcher>()
const polls = new Map<string, ReturnType<typeof setInterval>>()
const POLL_MS = 2500

/** 每个工作区只挂一个 watcher；重复调用会先停旧的。 */
export async function watchWorkspace(workspaceId: string): Promise<{ ok: true }> {
  const workspace = await getWorkspace(workspaceId)
  stopWorkspaceWatch(workspaceId)
  const watcher = watch(workspace.rootPath, { recursive: true }, (_event, filename) => {
    if (!filename) return
    emitWorkspaceChanged(workspaceId, String(filename).replaceAll("\\", "/"))
  })
  watcher.on("error", () => stopWorkspaceWatch(workspaceId))
  watchers.set(workspaceId, watcher)
  if (shouldPollWorkspaceWatch()) startFingerprintPoll(workspaceId, workspace.rootPath)
  return { ok: true }
}

export function stopWorkspaceWatch(workspaceId: string): void {
  const watcher = watchers.get(workspaceId)
  if (watcher) {
    watcher.close()
    watchers.delete(workspaceId)
  }
  const timer = polls.get(workspaceId)
  if (!timer) return
  clearInterval(timer)
  polls.delete(workspaceId)
}

function startFingerprintPoll(workspaceId: string, rootPath: string) {
  let last = ""
  const timer = setInterval(() => {
    void workspaceFingerprint(rootPath)
      .then((next) => {
        if (last && next !== last) emitWorkspaceChanged(workspaceId, ".")
        last = next
      })
      .catch(() => undefined)
  }, POLL_MS)
  polls.set(workspaceId, timer)
}

function emitWorkspaceChanged(workspaceId: string, path: string) {
  const payload = { workspaceId, path }
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("workspace.changed", payload)
  }
}
