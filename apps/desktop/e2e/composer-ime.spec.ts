/**
 * IME 组字：长中文不丢字，组字中 Enter 不发。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const PROMPT = "整理一下这个仓库的提交说明"

test("组字长中文不丢字，组字中 Enter 不发", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-ime-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-ime-ud-"))
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
    await window
      .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 20_000 })
      .catch(() => undefined)
    const skipGuide = window.getByRole("button", { name: "跳过设置" })
    if ((await skipGuide.count()) > 0) await skipGuide.click()
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await composer.click()
    const before = queryUserMessages(userData)
    await composer.evaluate((node, text) => {
      const el = node as HTMLTextAreaElement
      el.focus()
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
      let acc = ""
      for (const ch of text) {
        acc += ch
        el.value = acc
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, isComposing: true }))
        el.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: acc }))
      }
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 229,
          which: 229,
          bubbles: true,
          cancelable: true
        })
      )
    }, PROMPT)
    await expect(composer).toHaveValue(PROMPT)
    expect(queryUserMessages(userData)).toEqual(before)
    await window.screenshot({ path: join(shots, "p1_ime_before_enter.png"), fullPage: true })
    await composer.evaluate((node) => {
      const el = node as HTMLTextAreaElement
      el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: el.value }))
    })
    await expect(composer).toHaveValue(PROMPT)
    expect(queryUserMessages(userData)).toEqual(before)
    await composer.press("Enter")
    await expect.poll(() => queryUserMessages(userData)[0] ?? null, { timeout: 20_000 }).toBe(PROMPT)
    await expect(composer).toHaveValue("", { timeout: 15_000 })
    expect(queryUserMessages(userData).filter((item) => item === PROMPT)).toHaveLength(1)
    await window.screenshot({ path: join(shots, "p1_ime_please_zh.png"), fullPage: true })
  } finally {
    const proc = app.process()
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1_500))]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
})

function queryUserMessages(userData: string): string[] {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return []
  const db = new DatabaseSync(dbPath)
  try {
    const rows = db
      .prepare("SELECT content FROM messages WHERE role = 'user' ORDER BY created_at DESC")
      .all() as Array<{ content?: string }>
    return rows.map((row) => row.content ?? "")
  } finally {
    db.close()
  }
}
