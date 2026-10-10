/**
 * BASE-P0-1 窗口截图：启动 Electron 与向导步进。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "playwright"

export const MAIN_ENTRY = join(process.cwd(), "out/main/index.js")
export const SHOTS = "/opt/cursor/artifacts/screenshots"

export function canLaunchElectron(): string | null {
  if (!existsSync(MAIN_ENTRY)) return "out/main/index.js missing; run desktop build first"
  return null
}

export async function launchEnjoy(env: Record<string, string>): Promise<{
  app: ElectronApplication
  window: Page
}> {
  mkdirSync(SHOTS, { recursive: true })
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) throw new Error("playwright electron launcher unavailable")
  const userData = env.ENJOY_E2E_USERDATA ?? mkdtempSync(join(tmpdir(), "enjoy-p01-ud-"))
  const app = await electron.launch({
    args: [MAIN_ENTRY, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ...env
    }
  })
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  await window.setViewportSize({ width: 1440, height: 900 })
  return { app, window }
}

export async function snap(window: Page, name: string): Promise<void> {
  await window.screenshot({ path: join(SHOTS, `${name}.png`) })
}

export async function clickGuidePrimary(window: Page): Promise<void> {
  await window.getByTestId("setup-guide-primary").click()
}

/** 介绍 → 能力 → 引擎 → 连一个模型。 */
export async function openConnectModelStep(window: Page): Promise<void> {
  await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 20_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "Enjoy 能做什么" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "安装本机引擎" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByTestId("setup-guide-connect-model").waitFor({ timeout: 8_000 })
}
