/**
 * luna #123：盾牌三档有文案；定时高级时区单列；抽屉不挡标题栏月亮。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("luna #123：芯片文案、高级时区、抽屉月亮", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-123-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-123-ud-"))
  writeFileSync(join(workspace, "dirty.txt"), "change\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_CU_READY: "1",
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
    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await window.locator('[data-testid="page-automations"]').getByRole("button", { name: "新建" }).click()
    await window.locator("#automation-editor-title").waitFor({ timeout: 8_000 })
    await window.getByRole("button", { name: "定时" }).click()
    await window.locator('[data-testid="automation-schedule-advanced"]').click()
    await window.locator('[data-testid="automation-timezone-advanced"]').waitFor({ timeout: 8_000 })
    await expect(window.locator('[data-testid="automation-timezone-advanced"]')).toHaveText("北京时间（Asia/Shanghai）")
    await expect(window.locator('[data-testid="automation-timezone-field"] input')).toHaveCount(0)
    await expect(window.locator('[data-testid="automation-schedule"]')).toContainText("北京时间（Asia/Shanghai）")
    const preview = window.locator('[data-testid="automation-schedule-preview"]')
    const advanced = window.locator('[data-testid="automation-schedule-advanced"]')
    const previewBox = await preview.boundingBox()
    const advancedBox = await advanced.boundingBox()
    expect(previewBox && advancedBox).toBeTruthy()
    if (previewBox && advancedBox) {
      expect(advancedBox.y).toBeGreaterThan(previewBox.y + previewBox.height - 2)
    }
    const overlay = window.locator('[data-settings-drawer="open"]')
    const overlayBox = await overlay.boundingBox()
    expect(overlayBox).toBeTruthy()
    if (overlayBox) expect(overlayBox.y).toBeGreaterThanOrEqual(36)
    await snap(window, "b4_c_cron_advanced_1440_light")

    await window.setViewportSize({ width: 1100, height: 720 })
    await expect(window.locator('[data-testid="automation-timezone-advanced"]')).toHaveText("北京时间（Asia/Shanghai）")
    await snap(window, "b4_c_cron_advanced_1100_light")

    await window.getByRole("button", { name: "深色" }).click()
    await window.setViewportSize({ width: 1440, height: 900 })
    await expect(window.locator('[data-testid="automation-timezone-advanced"]')).toHaveText("北京时间（Asia/Shanghai）")
    await snap(window, "b4_c_cron_advanced_1440_dark")
    await window.setViewportSize({ width: 1100, height: 720 })
    await snap(window, "b4_c_cron_advanced_1100_dark")
    await snap(window, "b4_moon_with_drawer")

    await window.getByRole("button", { name: "浅色" }).click()
    await window.locator('[aria-label="关闭"]').first().click()
    const discard = window.getByRole("button", { name: "放弃" })
    if ((await discard.count()) > 0) await discard.click()
    await window.locator("#automation-editor-title").waitFor({ state: "hidden", timeout: 8_000 })

    await window.evaluate(() => {
      location.hash = "#/"
    })
    await window.setViewportSize({ width: 1440, height: 900 })
    const chip = window.getByRole("button", { name: "工具审批策略" })
    await chip.waitFor({ timeout: 20_000 })
    await expect(chip).toContainText(/读取|编辑|全部/)
    await chip.click()
    await window.getByText("全部", { exact: true }).first().click()
    await expect(chip).toContainText("全部")
    await snap(window, "b4_chip_all_label")
    await chip.click()
    await window.getByText("读取", { exact: true }).first().click()
    await expect(chip).toContainText("读取")

    const expandPane = window.getByRole("button", { name: "展开改动面板" })
    if ((await expandPane.count()) > 0) await expandPane.click()
    const reviewTab = window.getByRole("button", { name: /未提交差异与提交记录/ })
    if ((await reviewTab.count()) === 1) await reviewTab.click()
    await window.setViewportSize({ width: 1100, height: 720 })
    const commit = window.getByText("提交或推送")
    if ((await commit.count()) > 0) {
      const box = await commit.boundingBox()
      expect(box).toBeTruthy()
      if (box) expect(box.height).toBeLessThan(28)
      await snap(window, "b4_review_header_1100")
    }
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`) })
}
