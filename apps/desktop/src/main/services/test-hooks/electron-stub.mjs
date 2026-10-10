/**
 * node:test 用的 electron 桩：给生产路径（failAgentPump / decideApproval）一块 userData。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const userData = mkdtempSync(join(tmpdir(), "enjoy-catchup-"))

export const app = {
  isPackaged: false,
  getPath(name) {
    return name === "userData" ? userData : join(userData, String(name))
  }
}

export const safeStorage = {
  isEncryptionAvailable: () => false,
  getSelectedStorageBackend: () => "basic_text",
  encryptString: (text) => Buffer.from(String(text), "utf8"),
  decryptString: (buf) => Buffer.from(buf).toString("utf8")
}

export class BrowserWindow {
  static getAllWindows() {
    return []
  }
}

export class Notification {
  static isSupported() {
    return false
  }
  show() {}
}

export const dialog = { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) }
export const shell = { openExternal: async () => {}, openPath: async () => "" }
export const screen = {
  getPrimaryDisplay: () => ({
    bounds: { x: 0, y: 0, width: 1024, height: 768 },
    workArea: { x: 0, y: 0, width: 1024, height: 768 }
  })
}
export const ipcMain = { on() {}, handle() {}, removeHandler() {} }
export const globalShortcut = { register: () => false, unregister() {}, unregisterAll() {} }
export const desktopCapturer = { getSources: async () => [] }
export const systemPreferences = { getMediaAccessStatus: () => "granted" }
export const protocol = { registerSchemesAsPrivileged() {}, handle() {} }
export const net = { fetch: globalThis.fetch }
