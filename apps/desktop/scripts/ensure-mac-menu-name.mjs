/**
 * macOS 开发态菜单栏最左边的名字来自 Electron.app 的 CFBundleName。
 * app.setName 只改 Electron 内部名，系统菜单不读它。
 * 只改本仓库这份 plist 的显示名，不改 Bundle ID，不重签：
 * 开发用 Electron 的 Info.plist 没封进签名，重签会换 cdhash，屏幕录制授权会掉。
 * 也不调用 app.setName，避免 userData 换目录。
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const APP_NAME = "Enjoy Agents"
const DISPLAY_KEYS = ["CFBundleName", "CFBundleDisplayName"]
const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

/** 非 darwin 直接跳过，Win / Linux 的开发进程名不从这份 plist 来。 */
function electronInfoPlist() {
  const require = createRequire(join(desktopRoot, "package.json"))
  const pkgDir = dirname(require.resolve("electron/package.json"))
  const rel = readFileSync(join(pkgDir, "path.txt"), "utf8").trim()
  const executable = join(pkgDir, "dist", rel)
  const contents = dirname(dirname(executable))
  return join(contents, "Info.plist")
}

/** PlistBuddy 的 Print。键不存在时返回空串。 */
function readKey(plist, key) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plist], {
      encoding: "utf8"
    }).trim()
  } catch {
    return ""
  }
}

/** 有则 Set，没有则 Add。值可以含空格。 */
function writeKey(plist, key, value) {
  const command = readKey(plist, key) ? `Set :${key} ${value}` : `Add :${key} string ${value}`
  execFileSync("/usr/libexec/PlistBuddy", ["-c", command, plist], { stdio: "ignore" })
}

function ensureMacMenuName() {
  if (process.platform !== "darwin") return
  const plist = electronInfoPlist()
  if (!existsSync(plist)) {
    throw new Error(`Electron Info.plist missing: ${plist}`)
  }
  const bundleId = readKey(plist, "CFBundleIdentifier")
  const dirty = DISPLAY_KEYS.some((key) => readKey(plist, key) !== APP_NAME)
  if (!dirty) return
  for (const key of DISPLAY_KEYS) writeKey(plist, key, APP_NAME)
  if (readKey(plist, "CFBundleIdentifier") !== bundleId) {
    throw new Error("CFBundleIdentifier changed while renaming the menu")
  }
  console.log("macOS dev menu name set to Enjoy Agents. Restart pnpm dev to see it.")
}

ensureMacMenuName()
