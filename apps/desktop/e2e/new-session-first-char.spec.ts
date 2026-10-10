/**
 * P1：点「新对话」立刻打 hello，首字不得丢；已完成胶囊出现也不抢焦点。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("点新对话立刻打 hello，已完成胶囊在场也不丢首字", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-b6-hello-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-b6-hello-ud-"))
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

    await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
    await window.evaluate(() => {
      window.dispatchEvent(new CustomEvent("enjoy:e2e-complete-pill"))
    })
    await window.keyboard.type("hello")
    await expect(composer).toHaveValue("hello")
    await window.keyboard.press("Enter")
    const afterEnter = await composer.inputValue()
    const stage = window.locator('[data-chat-stage="true"]')
    const landed = afterEnter === "hello" || (await stage.textContent())?.includes("hello")
    expect(landed, "sent text must be exactly hello").toBeTruthy()
    expect((await stage.textContent()) ?? "", "must not send ello").not.toMatch(/\bello\b/)
    await snap(window, "b6_new_session_first_char")
  } finally {
    await app.close()
  }
})

async function snap(page: Page, name: string) {
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true })
}
