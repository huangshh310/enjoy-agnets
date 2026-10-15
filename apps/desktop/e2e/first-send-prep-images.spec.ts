/**
 * jojo P1（#145 gate5-11/12/13）：新对话「正在准备…」时发 A，0.5s 后再发 B。
 * A：Enter 即清输入框、只发一次；B（#155 gate2 jojo P1 改口径）：按下即取走（输入框清空）、不并进 A，
 * 排在 A 后面，A 跑完自动发 B，各发一次；不弹「没发出去 / 已放回」红卡、不把 A / B 还回输入框。
 *
 * （以下沿用 first-send-composer-clear 的启动助手）P1：新对话首发后输入框必须清空；创建窗内排队首发、重启后首发同理，且消息只入库一条。
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
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/first-send-prep-images")
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

/** 首发后常有待审批，裸 close 会撞退出确认框；统一 forceQuit + 兜底 kill。 */
async function shutdown(app: ElectronApplication): Promise<void> {
  await closeForRelaunch(app)
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

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")

function dump(userData: string): unknown {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    const msgs = db.prepare("SELECT m.id, m.session_id s, m.role, m.content FROM messages m WHERE m.role='user' ORDER BY m.created_at").all() as Array<Record<string, string>>
    const parts = db.prepare("SELECT message_id, type, payload FROM message_parts WHERE type LIKE '%file%' OR payload LIKE '%filename%'").all() as Array<Record<string, string>>
    const drafts = (() => { try { return db.prepare("SELECT session_id, assets_json FROM session_draft_assets").all() } catch { return [] } })()
    return {
      users: msgs.map((m) => ({ s: m.s, content: m.content, files: parts.filter((p) => p.message_id === m.id).map((p) => (JSON.parse(p.payload).filename ?? JSON.parse(p.payload).name ?? p.payload.slice(0, 80))) })),
      drafts
    }
  } finally { db.close() }
}

/** stub 认「very slow」：约 1.5s 一词、共约 15s，好让第三步真排队。 */
const FIRST = "第一条 very slow"

type Dump = { users: Array<{ s: string; content: string; files: string[] }>; drafts: Array<{ session_id: string; assets_json: string }> }

for (const variant of ["fresh", "olddraft"] as const) {
  test(`jojo 245dd0fc 实测（${variant}）：第一条不带别的会话旧图；准备中贴的图不丢；排队带图有队列条且图入库`, async () => {
    test.setTimeout(300_000)
    if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
    test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
    const boot = freshEnv({ ENJOY_DEV_DELAY_SESSION_CREATE_MS: "10000" })
    const { app, window } = await launch(boot.env)
    const chip = window.locator('[data-testid="composer-asset-chip"]')
    const composer = window.locator('[data-testid="composer-input"]')
    const attach = (name: string) => window.locator('[data-testid="composer-attach"]').setInputFiles({ name, mimeType: "image/png", buffer: PNG })
    const shot = async (name: string) => { mkdirSync(shots, { recursive: true }); await window.screenshot({ path: join(shots, `${variant}-${name}.png`), fullPage: true }) }
    const db = () => dump(boot.userData) as Dump
    try {
      await seedUsedSession(window, boot.userData)
      let oldSession = ""
      if (variant === "olddraft") {
        // 另一个新对话里留一张没发的草稿图。
        await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
        await expect(window.getByText("正在准备…")).toHaveCount(0, { timeout: 20_000 })
        await waitSendReady(window)
        await attach("old-draft.png")
        await expect(chip).toHaveCount(1, { timeout: 8_000 })
        await expect.poll(() => db().drafts.length, { timeout: 8_000 }).toBe(1)
        oldSession = db().drafts[0]!.session_id
        await shot("0-old-draft")
      }
      await window.locator('[data-testid="sidebar-new-session"]').click({ noWaitAfter: true })
      await expect(window.getByText("正在准备…")).toBeVisible({ timeout: 8_000 })
      // (a) 新对话输入框里没有别的会话的旧图。
      await expect(chip).toHaveCount(0)
      await composer.click()
      await window.keyboard.type(FIRST, { delay: 20 })
      await composer.press("Enter")
      // (b) 「正在准备…」期间贴图。
      await window.waitForTimeout(500)
      await attach("mid-prep.png")
      await expect(chip).toHaveCount(1, { timeout: 8_000 })
      await shot("1-during-prep")
      await expect(window.getByText("正在准备…")).toHaveCount(0, { timeout: 20_000 })
      await window.waitForTimeout(1_500)
      await expect(chip, "(b) 准备好后图仍在输入框").toHaveCount(1)
      await shot("2-after-prep")
      // (c) 第一条还在跑（stub「very slow」约 15s）时发「排队带图」（带着准备中贴的那张）。
      await expect.poll(() => db().users.some((u) => u.content === FIRST), { timeout: 10_000 }).toBe(true)
      await composer.click()
      await window.keyboard.type("排队带图", { delay: 20 })
      await composer.press("Enter")
      await expect(window.locator('[data-testid="queued-user-turn"]'), "(c) 有可见的排队条").toBeVisible({ timeout: 3_000 })
      await expect(chip).toHaveCount(0)
      await shot("3-queued")
      // 「very slow」中途停一张写盘审批：批准后第一条跑完，排队那条才自动发出。
      await window.getByRole("button", { name: "批准", exact: true }).click({ timeout: 30_000 })
      await expect.poll(() => db().users.some((u) => u.content === "排队带图"), { timeout: 60_000 }).toBe(true)
      await shot("4-final")
      const final = db()
      const first = final.users.find((u) => u.content === FIRST)!
      const queued = final.users.find((u) => u.content === "排队带图")!
      expect(first.files, "(a) 第一条不带任何图").toEqual([])
      expect(queued.files, "(b)(c) 排队那条带着准备中贴的图入库").toEqual(["mid-prep.png"])
      expect(queued.s).toBe(first.s)
      if (oldSession) {
        // 旧图还留在它自己会话的草稿里，没被挪走。
        const own = final.drafts.find((d) => d.session_id === oldSession)
        expect(own?.assets_json ?? "").toContain("old-draft.png")
      }
    } finally {
      await shutdown(app)
    }
  })
}
