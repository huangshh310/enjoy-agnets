/**
 * 隔离 userData 后以开发态种下 AUTO-P2 复检夹具。
 * 打包安装包不会读这个脚本；主进程在 app.isPackaged 时也会拒写。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const userData = mkdtempSync(join(tmpdir(), "enjoy-auto-p2-ud-"))
const workspace = mkdtempSync(join(tmpdir(), "enjoy-auto-p2-ws-"))

console.log("AUTO-P2 review seed (dev only, never packaged)")
console.log(`userData   ${userData}`)
console.log(`workspace  ${workspace}`)
console.log("flags      ENJOY_DEV_SEED_AUTO_P2=1 ENJOY_E2E_STUB=1 ENJOY_E2E_CU_READY=1 ENJOY_E2E_LANG=zh ENJOY_E2E_SESSION_COUNT=30")

const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ENJOY_DEV_SEED_AUTO_P2: "1",
    ENJOY_DEV_USERDATA: userData,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CU_READY: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_SESSION_COUNT: "30"
  }
})
child.on("exit", (code) => process.exit(code ?? 0))
