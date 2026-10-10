/**
 * P1：点新对话后「正在准备…」期间慢打，Enter 必须入队输入框全文。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const PROMPT = "hello world again"

test("正在准备时慢打 10 次，全文入库且输入框不回灌", async () => {
  test.setTimeout(420_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-prep-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-prep-ud-"))
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
      ENJOY_E2E_USERDATA: userData,
      ENJOY_DEV_DELAY_SESSION_CREATE_MS: "2000"
    }
  })
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await waitSendReady(window)
    await sendComposer(window, composer, "seed used session")
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    for (let i = 0; i < 10; i++) {
      const before = listUserContents(userData)
      await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
      await expect(window.getByText("正在准备…")).toBeVisible({ timeout: 8_000 })
      await composer.click()
      await typeSlow(window, PROMPT)
      await expect(composer).toHaveValue(PROMPT)
      expect(listUserContents(userData)).toEqual(before)
      if (i === 0) await window.screenshot({ path: join(shots, "p1_preparing_before_enter.png"), fullPage: true })
      await composer.press("Enter")
      await expect.poll(() => lastUserMessage(userData), { timeout: 25_000 }).toBe(PROMPT)
      await expect(composer).toHaveValue("", { timeout: 15_000 })
      await window.waitForTimeout(400)
      await expect(composer).toHaveValue("")
      expect(countUserMessages(userData, PROMPT)).toBe(i + 1)
      expect(listUserContents(userData).length).toBe(before.length + 1)
      const title = lastSessionTitle(userData)
      expect(title).toBeTruthy()
      expect(title).not.toBe("he")
      expect(title === PROMPT || (title ?? "").includes("hello")).toBeTruthy()
    }
    await window.screenshot({ path: join(shots, "p1_preparing_hello_world_again.png"), fullPage: true })
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

async function readyWindow(app: { firstWindow: () => Promise<Page> }) {
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
  return window
}

async function waitSendReady(window: Page) {
  await window.waitForFunction(
    () => {
      const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
      return label === "Send" || label === "发送"
    },
    undefined,
    { timeout: 15_000 }
  )
}

async function typeSlow(window: Page, text: string) {
  for (const ch of text) {
    await window.keyboard.type(ch)
    await window.waitForTimeout(80 + Math.floor(Math.random() * 71))
  }
}

function lastUserMessage(userData: string): string | null {
  return queryUserMessages(userData)[0] ?? null
}

function countUserMessages(userData: string, content: string): number {
  return queryUserMessages(userData).filter((item) => item === content).length
}

function listUserContents(userData: string): string[] {
  return queryUserMessages(userData)
}

function lastSessionTitle(userData: string): string | null {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return null
  const db = new DatabaseSync(dbPath)
  try {
    const row = db.prepare("SELECT title FROM sessions ORDER BY created_at DESC LIMIT 1").get() as
      | { title?: string }
      | undefined
    return row?.title ?? null
  } finally {
    db.close()
  }
}

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
