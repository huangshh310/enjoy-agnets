/**
 * 第六批补刀截图：新对话回焦、开发版不检查更新、个人资料、时区一次。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("第六批补刀：回焦、更新、资料、时区", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-b6hl-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-b6hl-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ENJOY_DEV_SEED_AUTO_P2: "1"
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    await window.setViewportSize({ width: 1440, height: 900 })
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()

    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(composer).toBeFocused({ timeout: 8_000 })
    await window.keyboard.type("hello from new chat")
    await expect(composer).toHaveValue("hello from new chat")
    await snap(window, "b6_new_session_focused")

    await window.locator('[data-testid="composer-overflow"]').click()
    await expect(window.getByText("会话心跳")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByRole("button", { name: "每天" })).toBeVisible()
    await expect(window.getByRole("button", { name: "工作日" })).toBeVisible()
    await expect(window.getByRole("button", { name: "每周" })).toBeVisible()
    await expect(window.locator("#session-heartbeat-cron")).toHaveCount(0)
    await expect(window.getByPlaceholder("15m 或 0 9 * * *")).toHaveCount(0)
    await snap(window, "b6_heartbeat_presets")
    await window.keyboard.press("Escape")

    await window.evaluate(() => {
      location.hash = "#/settings/general"
    })
    const devSkip = window.getByText("开发版本不检查更新。").first()
    await devSkip.waitFor({ timeout: 15_000 })
    await expect(window.getByRole("button", { name: "检查更新" })).toHaveCount(0)
    await devSkip.scrollIntoViewIfNeeded()
    await snap(window, "b6_dev_skip_update")

    await window.evaluate(() => {
      location.hash = "#/settings/account"
    })
    const engines = window.getByText("助手与模型").first()
    await engines.waitFor({ timeout: 15_000 })
    await expect(window.getByText("活跃先锋")).toBeVisible()
    await expect(window.getByText("百万吞吐")).toBeVisible()
    await expect(window.getByText(/主进程|vault|Blobatar|Wire API/i)).toHaveCount(0)
    await window.getByText("活跃先锋").first().scrollIntoViewIfNeeded()
    await snap(window, "b6_account_plain")

    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await window.locator('[data-testid="page-automations"]').getByRole("button", { name: "新建" }).click()
    await window.locator("#automation-editor-title").waitFor({ timeout: 8_000 })
    await window.getByRole("button", { name: "定时" }).click()
    await expect(window.locator('[data-testid="automation-schedule-preview"]')).toContainText("北京时间")
    await expect(window.locator('[data-testid="automation-schedule-preview"]')).not.toContainText("Asia/Shanghai")
    await window.locator('[data-testid="automation-schedule-advanced"]').click()
    await expect(window.locator('[data-testid="automation-timezone-advanced"]')).toHaveText("北京时间（Asia/Shanghai）")
    await expect(window.locator('[data-testid="automation-schedule-preview"]')).not.toContainText("北京时间")
    await snap(window, "b6_timezone_once")
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`) })
}
