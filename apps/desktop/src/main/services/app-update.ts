/**
 * 主进程自动更新：GitHub Releases + electron-updater。
 * 开发态默认不联网；ENJOY_UPDATE_DEV=1 才读 apps/desktop/dev-app-update.yml。
 */
import { join } from "node:path"
import { app, BrowserWindow } from "electron"
import { autoUpdater } from "electron-updater"
import type { AppUpdateSnapshot } from "@enjoy-agents/ipc-contract"
import { clampUpdatePercent, notesFromRelease } from "./app-update-notes"

const CHECK_DELAY_MS = 12_000

let snapshot: AppUpdateSnapshot = {
  status: "idle",
  currentVersion: "0.0.0"
}
let updaterWired = false
/** 下载完成后只 quitAndInstall 一次，UI 再调 install 是幂等兜底。 */
let installScheduled = false

export function getAppUpdateSnapshot(): AppUpdateSnapshot {
  return snapshot
}

/** 窗口起来后广播当前快照，12s 后再 check，避免一启动就打 GitHub。 */
export function startAppUpdate(): void {
  snapshot = { status: "idle", currentVersion: app.getVersion() }
  installScheduled = false
  wireUpdater()
  if (!canCheckRemote()) {
    publish({ status: "dev", currentVersion: app.getVersion() })
    return
  }
  publish(snapshot)
  setTimeout(() => {
    void checkForAppUpdate()
  }, CHECK_DELAY_MS)
}

export async function checkForAppUpdate(): Promise<AppUpdateSnapshot> {
  if (!canCheckRemote()) {
    publish({ status: "dev", currentVersion: app.getVersion() })
    return snapshot
  }
  if (snapshot.status === "checking" || snapshot.status === "downloading") return snapshot
  publish({ status: "checking", currentVersion: app.getVersion() })
  try {
    await autoUpdater.checkForUpdates()
    settleIfStillChecking()
  } catch (error) {
    publish({
      status: "error",
      currentVersion: app.getVersion(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  return snapshot
}

export async function downloadAppUpdate(): Promise<AppUpdateSnapshot> {
  if (snapshot.status === "ready" || snapshot.status === "downloading") return snapshot
  if (!canCheckRemote()) return snapshot
  publish({ ...snapshot, status: "downloading", percent: snapshot.percent ?? 0 })
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    publish({
      status: "error",
      currentVersion: app.getVersion(),
      version: snapshot.version,
      error: error instanceof Error ? error.message : String(error)
    })
  }
  return snapshot
}

export function installAppUpdate(): AppUpdateSnapshot {
  scheduleInstall()
  return snapshot
}

/** checkForUpdates 静默跳过时不会发 available/not-available，不能停在 checking。 */
function settleIfStillChecking(): void {
  if (snapshot.status !== "checking") return
  publish({ status: "up-to-date", currentVersion: app.getVersion() })
}

/** 打包应用，或显式打开开发 feed。 */
function canCheckRemote(): boolean {
  return app.isPackaged || process.env.ENJOY_UPDATE_DEV === "1"
}

function wireUpdater(): void {
  if (updaterWired) return
  updaterWired = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  applyDevFeed()
  bindUpdaterEvents()
}

/** unpackaged 默认没有 app-update.yml，必须 force + 指向 dev-app-update.yml。 */
function applyDevFeed(): void {
  if (app.isPackaged || process.env.ENJOY_UPDATE_DEV !== "1") return
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.updateConfigPath = join(__dirname, "../../dev-app-update.yml")
}

function bindUpdaterEvents(): void {
  autoUpdater.on("update-available", (info) => {
    publish({
      status: "available",
      currentVersion: app.getVersion(),
      version: info.version,
      releaseNotes: notesFromRelease(info.releaseNotes) || undefined
    })
  })
  autoUpdater.on("update-not-available", () => {
    publish({ status: "up-to-date", currentVersion: app.getVersion() })
  })
  autoUpdater.on("download-progress", (progress) => {
    publish({
      ...snapshot,
      status: "downloading",
      percent: clampUpdatePercent(progress.percent)
    })
  })
  autoUpdater.on("update-downloaded", (info) => {
    publish({
      status: "ready",
      currentVersion: app.getVersion(),
      version: info.version,
      releaseNotes: notesFromRelease(info.releaseNotes) || snapshot.releaseNotes,
      percent: 100
    })
    scheduleInstall()
  })
  autoUpdater.on("error", (error) => {
    publish({
      status: "error",
      currentVersion: app.getVersion(),
      version: snapshot.version,
      error: error.message
    })
  })
}

function scheduleInstall(): void {
  if (installScheduled || snapshot.status !== "ready") return
  installScheduled = true
  autoUpdater.quitAndInstall(false, true)
}

function publish(next: AppUpdateSnapshot): void {
  snapshot = next
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("app.update", snapshot)
  }
}
