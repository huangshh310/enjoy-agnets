/**
 * AppSnap 全局快捷键。只在 macOS 且开关打开时登记。
 * 左右修饰键交给 helper 轮询；带主键的组合交给 Electron。
 */
import { spawn, type ChildProcess } from "node:child_process"
import { BrowserWindow, globalShortcut } from "electron"
import { appsnapChordIssue, parseAppsnapChord, type KeybindingRule } from "@enjoy-agents/ipc-contract"
import { resolveAppsnapBinary } from "./appsnap-binary"
import { appsnapCapture } from "./appsnap-rpc"

type HotkeyPrefs = {
  appsnapEnabled: boolean
  appsnapChord: string
  keybindings: KeybindingRule[]
}

let registered: string | null = null
let watch: ChildProcess | null = null
let firing = false

export function syncAppsnapHotkey(prefs: HotkeyPrefs): void {
  stopAppsnapHotkey()
  if (process.platform !== "darwin" || !prefs.appsnapEnabled) return
  const chord = parseAppsnapChord(prefs.appsnapChord)
  if (!chord || appsnapChordIssue(chord, prefs.keybindings, "mac")) return
  const accelerator = electronAccelerator(chord)
  if (accelerator) {
    if (globalShortcut.register(accelerator, () => void publishSnap())) registered = accelerator
    return
  }
  startWatch(chord)
}

export function stopAppsnapHotkey(): void {
  if (registered) {
    try {
      globalShortcut.unregister(registered)
    } catch {
      // 已经卸过
    }
    registered = null
  }
  if (watch) {
    watch.kill()
    watch = null
  }
}

async function publishSnap(windowId?: number): Promise<void> {
  if (firing) return
  firing = true
  try {
    const shot = await appsnapCapture(windowId)
    const channel = shot.ok === true && typeof shot.pngBase64 === "string" ? "appsnap.captured" : "appsnap.failed"
    const payload = channel === "appsnap.captured" ? { pngBase64: shot.pngBase64 } : { line: String(shot.line ?? shot.code ?? "") }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload)
    }
  } finally {
    firing = false
  }
}

export async function publishAppsnapWindow(windowId?: number): Promise<Record<string, unknown>> {
  const shot = await appsnapCapture(windowId)
  if (shot.ok === true && typeof shot.pngBase64 === "string") {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("appsnap.captured", { pngBase64: shot.pngBase64 })
    }
  }
  return shot
}

function startWatch(chord: string): void {
  const binary = resolveAppsnapBinary()
  if (!binary) return
  const child = spawn(binary, ["watch", ...chord.split("+")], { stdio: ["ignore", "pipe", "ignore"] })
  watch = child
  let buffer = ""
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8")
    if (!buffer.includes("snap")) return
    buffer = ""
    void publishSnap()
  })
  child.on("exit", () => {
    if (watch === child) watch = null
  })
}

function electronAccelerator(chord: string): string | null {
  const parts = chord.split("+")
  const key = parts.find((part) => !part.includes(".") && !["mod", "ctrl", "alt", "shift"].includes(part))
  if (!key) return null
  const mods = parts.filter((part) => part !== key).map((part) => {
    if (part === "mod" || part.startsWith("meta")) return "CommandOrControl"
    if (part.startsWith("ctrl")) return "Control"
    if (part.startsWith("shift")) return "Shift"
    return "Alt"
  })
  const name = key.length === 1 ? key.toUpperCase() : key
  return [...mods, name].join("+")
}
