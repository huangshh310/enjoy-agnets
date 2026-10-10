/**
 * 隔离 userData 后以开发态种下 COST-P3 复检夹具。
 * 打包安装包不会读这个脚本；主进程在 app.isPackaged 时也会拒写。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const userData = mkdtempSync(join(tmpdir(), "enjoy-cost-ud-"))
const workspace = mkdtempSync(join(tmpdir(), "enjoy-cost-ws-"))

console.log("COST-P3 review seed (dev only, never packaged)")
console.log(`userData   ${userData}`)
console.log(`workspace  ${workspace}`)
console.log("flags      ENJOY_DEV_SEED_COST=1 ENJOY_E2E_STUB=1 ENJOY_E2E_LANG=zh")
console.log("sessions   DeepSeek · 估算金额 | Haiku · 分档未知 | 通义千问 · 无单价 / 自填单价")
console.log("           Claude CLI · 两组累计 | Ollama · 本地不计费 | 准备失败 · 不进未知")
console.log("           混合 · 部分未知")
console.log("live       新对话默认 DeepSeek Flash；stub finish 带 totalUsage")

const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["dev"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ENJOY_DEV_SEED_COST: "1",
    ENJOY_DEV_USERDATA: userData,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh"
  }
})
child.on("exit", (code) => process.exit(code ?? 0))
