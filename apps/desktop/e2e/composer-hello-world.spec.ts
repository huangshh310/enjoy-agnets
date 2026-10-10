/**
 * P1：点「新对话」立刻打 hello world + Enter，连跑 10 次不得截断。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const PROMPT = "hello world"

test("新对话立刻打 hello world + Enter，10 次都整句入库", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-hello10-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-hello10-ud-"))
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
    await window.waitForFunction(
      () => {
        const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
        return label === "Send" || label === "发送"
      },
      undefined,
      { timeout: 15_000 }
    )

    for (let i = 0; i < 10; i++) {
      await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
      await window.keyboard.type(PROMPT, { delay: 0 })
      await window.keyboard.press("Enter")
      await expect(composer).toHaveValue("", { timeout: 15_000 })
      await expect.poll(() => lastUserMessage(userData), { timeout: 15_000 }).toBe(PROMPT)
      if (i === 0) {
        await window.screenshot({ path: join(shots, "p1_hello_world_first.png"), fullPage: true })
      }
    }
    await window.screenshot({ path: join(shots, "p1_hello_world_10x.png"), fullPage: true })
    expect(countUserMessages(userData, PROMPT)).toBe(10)
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

function lastUserMessage(userData: string): string | null {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return null
  const db = new DatabaseSync(dbPath)
  try {
    const row = db
      .prepare("SELECT content FROM messages WHERE role = 'user' ORDER BY created_at DESC LIMIT 1")
      .get() as { content?: string } | undefined
    return row?.content ?? null
  } finally {
    db.close()
  }
}

function countUserMessages(userData: string, content: string): number {
  const dbPath = join(userData, "app.db")
  const db = new DatabaseSync(dbPath)
  try {
    const row = db
      .prepare("SELECT COUNT(*) as n FROM messages WHERE role = 'user' AND content = ?")
      .get(content) as { n: number }
    return Number(row.n)
  } finally {
    db.close()
  }
}
