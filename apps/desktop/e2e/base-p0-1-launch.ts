/**
 * BASE-P0-1 窗口截图：启动 Electron 与向导步进。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
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

const THEME_KEY = "boardui:theme"
const THEME_EVENT = "boardui:theme-change"

export async function forceTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  await window.evaluate(
    ({ next, key, eventName }) => {
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.dataset.theme = next
      window.localStorage.setItem(key, next)
      window.dispatchEvent(new CustomEvent(eventName, { detail: next }))
    },
    { next: theme, key: THEME_KEY, eventName: THEME_EVENT }
  )
}

/** 浅色 / 深色各拍一张。启动参数已带 `--disable-gpu`。 */
export async function snapThemes(window: Page, name: string): Promise<void> {
  await forceTheme(window, "light")
  await snap(window, `${name}-light`)
  await forceTheme(window, "dark")
  await snap(window, `${name}-dark`)
  await forceTheme(window, "light")
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

export async function skipGuideIfOpen(window: Page): Promise<void> {
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
}

/** 向导「添加 API 密钥」→ DeepSeek 简易表单。不要 hideGuide，以免首启闸把向导再打开。 */
export async function openAddKeyForm(window: Page): Promise<void> {
  await window.getByTestId("connect-model-api_key").click()
  await window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, {
    timeout: 8_000
  })
  await window.evaluate(() => {
    window.__enjoyE2e?.hideCreateProject()
  })
  await expect(window.getByTestId("provider-pick-panel")).toBeVisible()
  await window.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-testid="provider-pick-deepseek"]')?.click()
  })
  await expect(window.getByTestId("provider-simple-fields")).toBeVisible({ timeout: 8_000 })
}

export async function hideOverlays(window: Page): Promise<void> {
  await window.evaluate(() => {
    window.__enjoyE2e?.hideGuide()
    window.__enjoyE2e?.hideCreateProject()
  })
}

/** 已有项目重开向导，走到「可以开始了」并关掉。 */
export async function walkConnectedWizardThenStart(window: Page): Promise<void> {
  await window.evaluate(() => {
    window.__enjoyE2e?.replayGuide()
  })
  await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 12_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "Enjoy 能做什么" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "安装本机引擎" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByTestId("setup-guide-connect-model").waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "打开第一个项目" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "可以开始了" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("dialog").waitFor({ state: "hidden", timeout: 8_000 }).catch(() => undefined)
}

export async function sendHelloAndExpectReply(window: Page): Promise<void> {
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.click()
  await window.keyboard.type("hello")
  await window.keyboard.press("Enter")
  const thread = window.getByTestId("chat-conversation")
  await expect(thread.getByText("hello", { exact: true })).toBeVisible({ timeout: 12_000 })
  await expect(window.locator('[data-testid="thread-no-chat-route-notice"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="thread-need-model-notice"]')).toHaveCount(0)
  await expect(thread.getByText(/stub-ok/)).toBeVisible({ timeout: 15_000 })
}
