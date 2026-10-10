/**
 * jojo 复检截图：已完成胶囊、正在写、工具行人话、错误标题、审查空态、面包屑、24h、颜色模式。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("jojo 复检截图：胶囊 / 正在写 / 工具行 / 错误卡 / 审查 / 时间 / 外观", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-gate-ev-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-gate-ev-ud-"))
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
    await window.evaluate(() => document.documentElement.setAttribute("data-skin", "glass"))
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()

    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    await sendComposer(window, composer, "please go slow now")
    await expect(window.getByText("正在写")).toBeVisible({ timeout: 12_000 })
    await snap(window, "gate_writing_zh")
    await window.locator('[data-testid="composer-stop"]').click({ timeout: 8_000 }).catch(() => undefined)

    await sendComposer(window, composer, "hello complete")
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })
    const complete = window.locator('[data-testid="attention-complete-status"]')
    if ((await complete.count()) > 0) {
      await expect(complete).toBeVisible({ timeout: 8_000 })
      await expect(window.locator('[data-testid="chat-breadcrumb"]')).toBeVisible()
      await snap(window, "gate_complete_pill_no_cover")
      await window.locator('[data-testid="sidebar-new-session"]').click()
      await expect(complete).toHaveCount(0, { timeout: 8_000 })
      await snap(window, "gate_complete_pill_gone")
    }

    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-deny"]')).toBeVisible({ timeout: 20_000 })
    await window.locator('[data-testid="approval-deny"]').click()
    await expect(window.getByText("已拒绝，本次未执行")).toBeVisible({ timeout: 15_000 })
    await expect(window.getByText("写入 e2e-stub.txt")).toBeVisible()
    await expect(window.getByText("已拒绝", { exact: true })).toBeVisible()
    await snap(window, "gate_tool_row_plain")

    await sendComposer(window, composer, "夹具：存储失败")
    await expect(window.getByText("模型这次没回完")).toBeVisible({ timeout: 15_000 })
    await snap(window, "gate_error_title")

    const expandPane = window.getByRole("button", { name: "展开改动面板" })
    if ((await expandPane.count()) > 0) await expandPane.click()
    const reviewTab = window.getByRole("button", { name: /未提交差异与提交记录/ })
    if ((await reviewTab.count()) === 1) await reviewTab.click({ force: true })
    const clean = window.getByText("工作区没有未提交改动。")
    if ((await clean.count()) > 0) await expect(clean.first()).toBeVisible({ timeout: 12_000 })
    await expect(window.locator('[data-testid="chat-breadcrumb-project"]')).toBeVisible()
    const crumb = ((await window.locator('[data-testid="chat-breadcrumb"]').innerText()) ?? "").replace(/\s+/g, " ")
    expect(crumb).not.toMatch(/^..\s*>\s*.\.$/)
    await snap(window, "gate_review_empty_no_ring")
    await snap(window, "gate_breadcrumb_review_open")

    await window.evaluate(() => {
      location.hash = "#/automations"
    })
    await window.locator('[data-testid="page-automations"]').waitFor({ timeout: 15_000 })
    const openRow = window.locator('[data-testid="automation-row-open"]').first()
    if ((await openRow.count()) > 0) await openRow.click()
    await expect(window.locator('[data-testid="automation-schedule-time"]')).toBeVisible({ timeout: 12_000 })
    await expect(window.locator('[data-testid="automation-schedule-hour"]')).toBeVisible()
    await expect(window.getByText("AM")).toHaveCount(0)
    await expect(window.getByText("PM")).toHaveCount(0)
    await snap(window, "gate_time_picker_24h")

    await window.evaluate(() => {
      location.hash = "#/settings/appearance"
    })
    await expect(window.getByText("颜色模式").first()).toBeVisible({ timeout: 15_000 })
    await expect(window.locator(".theme-switch__container")).toBeVisible()
    await snap(window, "gate_appearance_color_mode")
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 8_000))])
  }
})

async function snap(window: Page, name: string) {
  await window.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
