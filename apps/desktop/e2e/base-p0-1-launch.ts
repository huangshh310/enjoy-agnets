/**
 * BASE-P0-1 窗口截图：启动 Electron 与向导步进。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
import type { ElectronApplication, Locator, Page } from "playwright"

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

/** 向导弹窗里有限次的动画（zoom-in-95 进场 / zoom-out-95 退场）都跑完；无限循环的（转圈）不等。元素没了就算完。 */
async function guideAnimationsSettled(window: Page, skip: Locator): Promise<void> {
  await window
    .getByRole("dialog")
    .filter({ has: skip })
    .first()
    .evaluate((el) =>
      Promise.all(
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined))
      )
    , undefined, { timeout: 3_000 })
    .catch(() => undefined)
}

/**
 * 有「跳过设置」就点掉，并确认向导真的收掉了。
 * 向导的 DialogContent 每次打开都换 key（dialog-open-generation.ts）、进场带 zoom-in-95：
 * 首启闸在启动早期会把向导关了再开，按钮会「不稳定」（还在缩放）或「已从 DOM 卸下」（换了一代）；
 * 旧写法 count()>0 后直接 click()，赶上向导刚被收掉，click 就对着一个不会回来的按钮等满 30 秒。
 * 这里每轮重新查按钮：没了就结束；有就等动画跑完再点（短超时），点不到（卸下 / 不稳定 / 被收掉）就重查再来；
 * 点到后等按钮消失。不用 force、不靠固定 sleep。
 */
export async function skipGuideIfOpen(window: Page, timeout = 20_000): Promise<void> {
  const skip = window.getByRole("button", { name: "跳过设置" })
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if ((await skip.count()) === 0) return
    await guideAnimationsSettled(window, skip)
    try {
      await skip.click({ timeout: 2_000 })
    } catch {
      continue
    }
    try {
      await expect(skip).toHaveCount(0, { timeout: 5_000 })
      return
    } catch {
      // 点完又被首启闸重新打开：下一轮再收
    }
  }
  await expect(skip, "向导「跳过设置」一直收不掉").toHaveCount(0, { timeout: 1_000 })
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
