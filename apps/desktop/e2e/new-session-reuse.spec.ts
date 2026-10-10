/**
 * Host P1：点「新对话」后输入框获焦；空会话上再点不叠会话。
 * 不覆盖 BASE-P0-3 的草稿落库 / 启动回收。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("点新对话后输入进入 Composer，会话数最多 +1", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-b6-new-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-b6-new-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
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
    const before = await window.locator('[data-testid="sidebar-session-row"]').count()

    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(composer).toBeFocused({ timeout: 8_000 })
    const afterClick = await window.locator('[data-testid="sidebar-session-row"]').count()
    expect(afterClick - before).toBeLessThanOrEqual(1)
    await window.keyboard.type("hello from new chat")
    await expect(composer).toHaveValue("hello from new chat")
    await window.keyboard.press("Enter")
    const afterEnter = await composer.inputValue()
    const stage = window.locator('[data-chat-stage="true"]')
    const landed = afterEnter.includes("hello from new chat") || (await stage.textContent())?.includes("hello from new chat")
    expect(landed, "typed text must not be lost after 新对话").toBeTruthy()
    const afterSend = await window.locator('[data-testid="sidebar-session-row"]').count()
    expect(afterSend).toBe(afterClick)
    await snap(window, "b6_new_session_reuse")
  } finally {
    await app.close()
  }
})

async function snap(page: Page, name: string) {
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
