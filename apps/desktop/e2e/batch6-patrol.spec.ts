/**
 * 第六批巡检截图：审查空态无黄环、⋯ 菜单、快捷键分名、夹具名。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("第六批巡检：黄环、Diff 词、快捷键、夹具名", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-b6-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-b6-ud-"))
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
    await window.evaluate(() => document.documentElement.setAttribute("data-skin", "glass"))
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()

    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await expect(window.getByText("午间改动复盘")).toBeVisible()
    await snap(window, "b6_seed_noon_review")

    await window.evaluate(() => {
      location.hash = "#/settings/shortcuts"
    })
    await window.getByText("键盘快捷键目录").waitFor({ timeout: 15_000 })
    await expect(window.getByText("快速搜索", { exact: true }).first()).toBeVisible()
    await expect(window.getByText("命令面板", { exact: true }).first()).toBeVisible()
    await expect(window.getByText("审查", { exact: true }).first()).toBeVisible()
    await snap(window, "b6_shortcuts_distinct")
    const emptyInput = window.getByText(/输入框为空/)
    await emptyInput.scrollIntoViewIfNeeded()
    await expect(emptyInput).toBeVisible()
    await snap(window, "b6_shortcuts_empty_input")

    await window.evaluate(() => {
      location.hash = "#/settings/rules"
    })
    const cleanRule = window.getByText("代码整洁 · 精准小改")
    if ((await cleanRule.count()) > 0) {
      await expect(cleanRule.first()).toBeVisible()
      await snap(window, "b6_rule_clean_edits")
    }

    await window.evaluate(() => {
      location.hash = "#/"
    })
    const expandPane = window.getByRole("button", { name: "展开改动面板" })
    if ((await expandPane.count()) > 0) await expandPane.click()
    const reviewTab = window.getByRole("button", { name: /未提交差异与提交记录/ })
    if ((await reviewTab.count()) === 1) await reviewTab.click({ force: true })
    const clean = window.getByText("工作区没有未提交改动。")
    if ((await clean.count()) > 0) await expect(clean.first()).toBeVisible({ timeout: 12_000 })
    await snap(window, "b6_review_empty_no_ring")

    const more = window.locator('button[title="会话位置"]')
    if ((await more.count()) > 0) {
      await more.click()
      await expect(window.getByText("复制全部改动")).toBeVisible()
      await expect(window.getByText("高级")).toBeVisible()
      await snap(window, "b6_review_more_menu")
      await window.getByText("高级").click()
      await expect(window.getByText("复制 git apply 命令")).toBeVisible()
      await snap(window, "b6_review_advanced_git_apply")
    }
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`) })
}
