/**
 * AUTO-P2 窗口冒烟：跳过次行、组摘要开合、默认关、未跑不写实际/取消时间、Dock 补跑 / 终端敏感。
 */
import { existsSync, mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("AUTO-P2：错过次行 / 组摘要 / 默认关 / 超时非红 / Dock 来源", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-auto-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-auto-ud-"))
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
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

    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    await expect(row(window, "晨间待办整理")).toContainText("错过 3 次 · 电脑睡眠")
    await expect(row(window, "晚间日志归档")).toContainText("已跳过 · 应用未运行")
    await expect(row(window, "忙时跳过示例")).toContainText("已跳过 · 上次仍在运行")
    await expect(row(window, "混因错过示例")).toContainText("错过 3 次 · 最近一次应用未运行")
    await expect(row(window, "补跑超时示例")).toContainText("补跑等待确认超时，未运行")
    await expect(row(window, "补跑重启打断示例")).toContainText("补跑被重启打断，未运行")
    await expect(window.locator('[data-testid="automation-row-neutral"]').first()).not.toHaveClass(/error/)
    await snap(window, "auto-p2-list")

    await openRow(window, "晨间待办整理")
    await expect(window.locator('[data-testid="automation-missed-summary"]')).toContainText("错过 3 次 · 电脑睡眠")
    await expect(window.locator('[data-testid="automation-missed-toggle"]')).toHaveText("展开")
    await snap(window, "auto-p2-drawer-group-closed")
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-missed-toggle"]')).toHaveText("收起")
    await snap(window, "auto-p2-drawer-group")
    await closeDrawer(window)

    await openRow(window, "混因错过示例")
    await expect(window.locator('[data-testid="automation-missed-summary"]')).toContainText("错过 3 次 · 最近一次应用未运行")
    await snap(window, "auto-p2-drawer-mixed")
    await closeDrawer(window)

    await window.locator('[data-testid="page-automations"]').getByRole("button", { name: "新建" }).click()
    await expect(window.locator('[data-testid="automation-catch-up-toggle"]')).toHaveCount(0)
    await window.getByRole("button", { name: "cron" }).click()
    await window.locator('[data-testid="automation-catch-up-toggle"]').waitFor({ timeout: 8_000 })
    const createToggle = window.locator('[data-testid="automation-catch-up-toggle"] [role="switch"]')
    await expect(createToggle).toHaveAttribute("aria-checked", "false")
    await snap(window, "auto-p2-drawer-default-off")
    await closeDrawer(window)

    await openRow(window, "午间 diff 复盘")
    const toggle = window.locator('[data-testid="automation-catch-up-toggle"] [role="switch"]')
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-missed-toggle"]')).toHaveText("收起")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("补跑")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("计划")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("实际")
    await snap(window, "auto-p2-drawer-catchup")
    await closeDrawer(window)

    await openRow(window, "补跑超时示例")
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-missed-toggle"]')).toHaveText("收起")
    await expect(window.locator('[data-testid="automation-record-neutral"]')).toContainText("补跑等待确认超时，未运行")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("计划")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("未运行")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).not.toContainText("实际")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).not.toContainText("取消")
    await snap(window, "auto-p2-drawer-timeout")
    await closeDrawer(window)

    await openRow(window, "补跑重启打断示例")
    await window.locator('[data-testid="automation-missed-expand"] summary').click()
    await expect(window.locator('[data-testid="automation-missed-toggle"]')).toHaveText("收起")
    await expect(window.locator('[data-testid="automation-record-neutral"]')).toContainText("补跑被重启打断，未运行")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("计划")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).toContainText("未运行")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).not.toContainText("实际")
    await expect(window.locator('[data-testid="automation-missed-catch-up"]')).not.toContainText("取消")
    await snap(window, "auto-p2-drawer-interrupt")
    await closeDrawer(window)

    await window.evaluate(() => {
      location.hash = "#/settings/general"
    })
    await window.getByRole("button", { name: "重新打开" }).click()
    await window.getByRole("button", { name: "开始" }).click()
    await window.getByRole("tab", { name: "到点再跑" }).click()
    await expect(window.getByText("默认不补跑，可在单条自动化里开启补跑最近一次")).toBeVisible()
    await snap(window, "auto-p2-settings-cap")
    await window.getByRole("button", { name: "跳过设置" }).click()

    await window.evaluate(() => {
      location.hash = "#/"
    })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "desktop catchup notes")
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="approval-automation-source"]')).toContainText(
      "来自自动化「晨间待办整理」的补跑"
    )
    await snap(window, "auto-p2-dock-catchup")
    await dismissApproval(window)

    await sendComposer(window, composer, "desktop catchup terminal")
    await window.locator('[data-testid="desktop-approval-sensitive"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="approval-allow"]')).toHaveAttribute("aria-checked", "true")
    await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="approval-always-app"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="approval-automation-source"]')).toContainText(
      "来自自动化「晨间类型检查」的补跑"
    )
    await snap(window, "auto-p2-dock-terminal")
    await dismissApproval(window)
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

function row(window: Page, name: string) {
  return window.locator('[data-testid="automation-row"]').filter({ hasText: name })
}

async function openRow(window: Page, name: string) {
  await row(window, name).locator("button").first().click()
  await window.locator("#automation-editor-title").waitFor({ timeout: 8_000 })
  const summary = window.locator('[data-testid="automation-missed-summary"]')
  if ((await summary.count()) > 0) {
    await summary.waitFor({ state: "visible", timeout: 8_000 })
    await summary.scrollIntoViewIfNeeded()
  }
}

async function closeDrawer(window: Page) {
  await window.locator('[aria-label="关闭"]').first().click()
  await window.locator("#automation-editor-title").waitFor({ state: "hidden", timeout: 8_000 })
}

async function dismissApproval(window: Page) {
  await window.locator('[data-testid="approval-deny"]').click()
  await window.locator('[data-testid="approval-continue"]').click()
  await window.locator('[data-testid="desktop-approval-card"]').waitFor({ state: "detached", timeout: 12_000 })
}

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
