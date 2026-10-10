/**
 * P1：逐字慢打（80–150ms）再 Enter。创建完成 / 挂载 / 焦点不得先发。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"
const logs = "/opt/cursor/artifacts/logs"
const PROMPTS = ["hello world", "stub store error"] as const

test("新对话逐字慢打 10 次 + 慢建会话，整句入库且 Enter 前不发", async () => {
  test.setTimeout(420_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  mkdirSync(logs, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-hello10-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-hello10-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const dbLines: string[] = []

  const app = await launchApp(electron, workspace, userData)
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await waitSendReady(window)

    const before = countUserMessages(userData)
    for (let i = 0; i < 10; i++) {
      const prompt = PROMPTS[i % PROMPTS.length]
      await runSlowTypeSend(window, composer, userData, prompt, before + i, dbLines, i === 0)
    }
    await window.screenshot({ path: join(shots, "p1_hello_world_10x.png"), fullPage: true })
    expect(countUserMessages(userData) - before).toBe(10)
  } finally {
    await closeApp(app)
  }

  const slowUserData = mkdtempSync(join(tmpdir(), "enjoy-hello-slow-ud-"))
  const slowApp = await launchApp(electron, workspace, slowUserData, { ENJOY_DEV_DELAY_SESSION_CREATE_MS: "400" })
  try {
    const window = await readyWindow(slowApp)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await waitSendReady(window)
    const before = countUserMessages(slowUserData)
    await runSlowTypeSend(window, composer, slowUserData, "hello world", before, dbLines, false, "p1_slow_create")
    await window.screenshot({ path: join(shots, "p1_slow_create_hello.png"), fullPage: true })
    expect(countUserMessages(slowUserData) - before).toBe(1)
  } finally {
    await closeApp(slowApp)
  }

  writeFileSync(join(logs, "p1_slow_type_db.txt"), dbLines.join("\n"))
})

test("已有会话逐字慢打 please write a note，整句入库且 Enter 前不发", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-hello-exist-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-hello-exist-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const app = await launchApp(electron, workspace, userData)
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await waitSendReady(window)
    await sendComposer(window, composer, "seed existing session")
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })
    const prompt = "please write a note"
    const beforeEnter = listUserContents(userData)
    await composer.click()
    await typeSlow(window, prompt)
    await expect(composer).toHaveValue(prompt)
    expect(listUserContents(userData)).toEqual(beforeEnter)
    await window.screenshot({ path: join(shots, "p1_existing_before_enter.png"), fullPage: true })
    await composer.press("Enter")
    await expect.poll(() => lastUserMessage(userData), { timeout: 20_000 }).toBe(prompt)
    await expect(composer).toHaveValue("", { timeout: 15_000 })
    expect(countUserMessages(userData, prompt)).toBe(1)
    expect(listUserContents(userData).length).toBe(beforeEnter.length + 1)
    await window.screenshot({ path: join(shots, "p1_existing_please_write_a_note.png"), fullPage: true })
  } finally {
    await closeApp(app)
  }
})

async function runSlowTypeSend(
  window: Page,
  composer: ReturnType<Page["locator"]>,
  userData: string,
  prompt: string,
  expectedTotal: number,
  dbLines: string[],
  snapFirst: boolean,
  shotName?: string
) {
  const beforeEnter = listUserContents(userData)
  await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
  await composer.click()
  await typeSlow(window, prompt)
  await expect(composer).toHaveValue(prompt)
  expect(listUserContents(userData)).toEqual(beforeEnter)
  if (snapFirst) {
    await window.screenshot({ path: join(shots, "p1_hello_world_before_enter.png"), fullPage: true })
  }
  await composer.press("Enter")
  await expect.poll(() => lastUserMessage(userData), { timeout: 20_000 }).toBe(prompt)
  await expect(composer).toHaveValue("", { timeout: 15_000 })
  expect(countUserMessages(userData, prompt)).toBeGreaterThanOrEqual(1)
  expect(listUserContents(userData).length).toBe(expectedTotal + 1)
  dbLines.push(`${prompt}\t${lastUserMessage(userData)}\tcount=${countUserMessages(userData, prompt)}`)
  if (shotName) await window.screenshot({ path: join(shots, `${shotName}.png`), fullPage: true })
}

async function typeSlow(window: Page, text: string) {
  for (const ch of text) {
    await window.keyboard.type(ch)
    await window.waitForTimeout(80 + Math.floor(Math.random() * 71))
  }
}

async function launchApp(
  electron: { launch: (opts: Record<string, unknown>) => Promise<{ firstWindow: () => Promise<Page>; close: () => Promise<void>; process: () => { kill: (sig: string) => void } | null }> },
  workspace: string,
  userData: string,
  extraEnv?: Record<string, string>
) {
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ...extraEnv
    }
  })
}

async function readyWindow(app: { firstWindow: () => Promise<Page> }) {
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  await window.setViewportSize({ width: 1440, height: 900 })
  await dismissSetupGuide(window)
  return window
}

async function dismissSetupGuide(window: Page) {
  await window
    .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 20_000 })
    .catch(() => undefined)
  const skipGuide = window.getByRole("button", { name: "跳过设置" })
  if ((await skipGuide.count()) > 0) await skipGuide.click()
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

async function closeApp(app: { close: () => Promise<void>; process: () => { kill: (sig: string) => void } | null }) {
  const proc = app.process()
  await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 1_500))]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

function lastUserMessage(userData: string): string | null {
  const rows = queryUserMessages(userData)
  return rows[0] ?? null
}

function countUserMessages(userData: string, content?: string): number {
  if (!content) return queryUserMessages(userData).length
  return queryUserMessages(userData).filter((item) => item === content).length
}

function listUserContents(userData: string): string[] {
  return queryUserMessages(userData)
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
