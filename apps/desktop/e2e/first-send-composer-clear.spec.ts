/**
 * P1：新对话首发后输入框必须清空；创建窗内排队首发、重启后首发同理，且消息只入库一条。
 * 慢打（每键 80–150ms），不走 fill，贴近真人打字时序。
 * luna 的复现带了 @readme.md 引用 Chip：发出的 content 前面垫了引用，和输入框原文对不上，
 * clearSentComposerText 把 React 回写的旧字当成「还没发」塞回 store（#128 回归）。
 * 被拦的发送必须出 notice 并留草稿，不能静默。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/first-send-composer-clear")
const launchArgs = [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]

type Boot = { workspace: string; userData: string; env: NodeJS.ProcessEnv }

function freshEnv(extra: Record<string, string> = {}): Boot {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-ffs-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-ffs-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return {
    workspace,
    userData,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ...extra
    }
  }
}

async function launch(env: NodeJS.ProcessEnv): Promise<{ app: ElectronApplication; window: Page }> {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) throw new Error("playwright electron launcher unavailable")
  const app = await electron.launch({ args: launchArgs, cwd: process.cwd(), timeout: 60_000, env })
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 30_000 })
  await window.setViewportSize({ width: 1440, height: 900 })
  await window
    .waitForSelector('button:has-text("跳过设置"), [data-testid="composer-input"]', { timeout: 30_000 })
    .catch(() => undefined)
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 30_000 })
  return { app, window }
}

async function shutdown(app: ElectronApplication): Promise<void> {
  const proc = app.process()
  await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

async function waitSendReady(window: Page): Promise<void> {
  await window.waitForFunction(
    () => {
      const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
      return label === "Send" || label === "发送"
    },
    undefined,
    { timeout: 30_000 }
  )
}

async function typeSlow(window: Page, text: string): Promise<void> {
  for (const ch of text) {
    await window.keyboard.type(ch)
    await window.waitForTimeout(80 + Math.floor(Math.random() * 71))
  }
}

function userMessages(userData: string): string[] {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return []
  const db = new DatabaseSync(dbPath)
  try {
    const rows = db.prepare("SELECT content FROM messages WHERE role = 'user'").all() as Array<{ content?: string }>
    return rows.map((row) => row.content ?? "")
  } finally {
    db.close()
  }
}

/** 发出 = 库里恰好一条以原文结尾的用户消息 + 主区气泡；清空 = 输入框为空且 1s 后、回复到达后仍为空（不回灌）。 */
async function expectSentAndCleared(window: Page, userData: string, text: string, shot: string): Promise<void> {
  const composer = window.locator('[data-testid="composer-input"]')
  const stage = window.locator('[data-chat-stage="true"]')
  const sent = () => userMessages(userData).filter((item) => item.endsWith(text)).length
  await expect.poll(sent, { timeout: 30_000 }).toBe(1)
  await expect(stage).toContainText(text, { timeout: 20_000 })
  await expect(composer).toHaveValue("", { timeout: 10_000 })
  await window.waitForTimeout(1_000)
  await expect(composer).toHaveValue("")
  await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
  mkdirSync(shots, { recursive: true })
  await window.screenshot({ path: join(shots, `${shot}.png`), fullPage: true })
  await window.waitForTimeout(1_500)
  await expect(composer).toHaveValue("")
  expect(sent()).toBe(1)
}

/** 启动自带空会话会被「新对话」复用；先发一句把它用掉，后面点新对话才真走创建。 */
async function seedUsedSession(window: Page, userData: string, text = "seed used session"): Promise<void> {
  await waitSendReady(window)
  const composer = window.locator('[data-testid="composer-input"]')
  await composer.click()
  await typeSlow(window, text)
  await composer.press("Enter")
  await expect.poll(() => userMessages(userData).includes(text), { timeout: 30_000 }).toBe(true)
  await expect(window.locator('[data-chat-stage="true"]').getByText("stub-ok").first()).toBeVisible({
    timeout: 30_000
  })
  await expect(composer).toHaveValue("")
}

/** 和 luna 一样：@readme 选中文件，钉一颗引用 Chip。 */
async function attachReadmeChip(window: Page): Promise<void> {
  await typeSlow(window, "@readme")
  await window.locator('[data-testid="composer-mention-item"]').filter({ hasText: "readme.md" }).first().waitFor({
    timeout: 15_000
  })
  await window.keyboard.press("Enter")
  await expect(window.locator('[data-testid="composer-quote-chip"]')).toContainText("readme.md", { timeout: 10_000 })
  await expect(window.locator('[data-testid="composer-input"]')).toHaveValue("")
}

async function newChat(window: Page): Promise<void> {
  await window.locator('[data-testid="sidebar-new-session"]').click()
  const stage = window.locator('[data-chat-stage="true"]')
  await expect(stage).toContainText(/在 .* 里做什么|What should we do/, { timeout: 15_000 })
  await waitSendReady(window)
  await window.locator('[data-testid="composer-input"]').click()
}

test("(a) 新对话首发（带 @ 引用）：消息入库一条且输入框清空", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv()
  const { app, window } = await launch(boot.env)
  try {
    await seedUsedSession(window, boot.userData)
    await newChat(window)
    await attachReadmeChip(window)
    const text = "please write a note"
    await typeSlow(window, text)
    await expect(window.locator('[data-testid="composer-input"]')).toHaveValue(text)
    await window.keyboard.press("Enter")
    await expectSentAndCleared(window, boot.userData, text, "a-new-chat-first-send")
  } finally {
    await shutdown(app)
  }
})

test("(b) 新对话创建中排队首发：消息入库一条且输入框清空", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv({ ENJOY_DEV_DELAY_SESSION_CREATE_MS: "4000" })
  const { app, window } = await launch(boot.env)
  try {
    await seedUsedSession(window, boot.userData)
    await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
    await expect(window.getByText("正在准备…")).toBeVisible({ timeout: 8_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.click()
    const text = "queued send"
    await typeSlow(window, text)
    await expect(composer).toHaveValue(text)
    await expect(window.getByText("正在准备…")).toBeVisible()
    await composer.press("Enter")
    await expectSentAndCleared(window, boot.userData, text, "b-queued-first-send")
  } finally {
    await shutdown(app)
  }
})

test("(c) 等审批时重启，再开新对话首发（带 @ 引用）：不被吞掉且输入框清空", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv()
  const first = await launch(boot.env)
  try {
    await waitSendReady(first.window)
    const composer = first.window.locator('[data-testid="composer-input"]')
    await composer.click()
    await typeSlow(first.window, "please write a note")
    await composer.press("Enter")
    await first.window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 30_000 })
    await expect(composer).toHaveValue("")
  } finally {
    await closeForRelaunch(first.app)
  }
  const { app, window } = await launch(boot.env)
  try {
    await expect(window.locator('[data-testid="approval-allow"]')).toBeVisible({ timeout: 30_000 })
    await newChat(window)
    await attachReadmeChip(window)
    const text = "first send after restart"
    await typeSlow(window, text)
    await expect(window.locator('[data-testid="composer-input"]')).toHaveValue(text)
    await window.keyboard.press("Enter")
    await expectSentAndCleared(window, boot.userData, text, "c-restart-first-send")
  } finally {
    await closeForRelaunch(app)
  }
})

test("(c′) 正常重启后新对话纯文本首发：不被吞掉且输入框清空", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv()
  const first = await launch(boot.env)
  try {
    await seedUsedSession(first.window, boot.userData, "seed before restart")
  } finally {
    await shutdown(first.app)
  }
  const { app, window } = await launch(boot.env)
  try {
    await newChat(window)
    const text = "plain first send after restart"
    await typeSlow(window, text)
    await window.keyboard.press("Enter")
    await expectSentAndCleared(window, boot.userData, text, "c-plain-restart-first-send")
  } finally {
    await shutdown(app)
  }
})

test("(d) 新对话首发被拦：出提示、草稿留着、不入库", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const boot = freshEnv()
  const { app, window } = await launch(boot.env)
  try {
    await seedUsedSession(window, boot.userData)
    await newChat(window)
    await attachReadmeChip(window)
    const text = "blocked first send"
    await typeSlow(window, text)
    await window.evaluate(() => {
      window.__enjoyE2e?.clearSelectedModel()
    })
    await expect
      .poll(() => window.evaluate(() => window.__enjoyE2e?.getComposerGate?.().modelId ?? "x"), { timeout: 4_000 })
      .toBe("")
    await window.keyboard.press("Enter")
    await expect(window.locator('[data-testid="thread-need-model-notice"]')).toBeVisible({ timeout: 10_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await expect(composer).toHaveValue(text)
    await window.waitForTimeout(1_000)
    await expect(composer).toHaveValue(text)
    await expect(window.locator('[data-testid="composer-quote-chip"]')).toContainText("readme.md")
    expect(userMessages(boot.userData).filter((item) => item.endsWith(text))).toEqual([])
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "d-blocked-keeps-draft.png"), fullPage: true })
  } finally {
    await shutdown(app)
  }
})
