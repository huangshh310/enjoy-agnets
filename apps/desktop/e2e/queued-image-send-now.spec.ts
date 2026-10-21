/**
 * jojo #155 gate4：排队项带图——「马上发给它」图随纠偏入库发给模型；× 删掉不留草稿；切走切回不冒只图草稿。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/queued-image-send-now")
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




const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAOklEQVR42u3OMQ0AAAgDsEmbfxVIwQXhaFIBzbSvREhISEhISEhISEhISEhISEhISEhISEhISEjozgKXaGC19rykhgAAAABJRU5ErkJggg==", "base64")

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

const FIRST = "第一条 very slow"
const REMOVE_LABEL = "移除排队任务"
type Dump = { users: Array<{ s: string; content: string; files: string[] }>; drafts: Array<{ session_id: string; assets_json: string }> }

async function queueWithImage(window: Page, text: string, file: string) {
  const composer = window.locator('[data-testid="composer-input"]')
  await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: file, mimeType: "image/png", buffer: PNG })
  await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
  await composer.click()
  await window.keyboard.type(text, { delay: 20 })
  await composer.press("Enter")
  await expect(window.locator('[data-testid="queued-user-turn"]')).toBeVisible({ timeout: 5_000 })
  await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(0)
}

async function switchAwayAndBack(window: Page, sessionId: string) {
  await window.locator('[data-testid="sidebar-new-session"]').click()
  await expect(window.getByText("正在准备…")).toHaveCount(0, { timeout: 20_000 })
  await window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId}"]`).first().click()
  await window.waitForTimeout(800)
}

for (const variant of ["send-now", "remove"] as const) {
  test(`jojo #155 gate4（${variant}）：排队项的图跟着排队项走，不留草稿`, async () => {
    test.setTimeout(300_000)
    if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
    test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
    const boot = freshEnv({ ENJOY_E2E_STUB_VISION: "1" })
    const { app, window } = await launch(boot.env)
    const db = () => dump(boot.userData) as Dump
    const chip = window.locator('[data-testid="composer-asset-chip"]')
    const shot = async (name: string) => {
      mkdirSync(shots, { recursive: true })
      await window.screenshot({ path: join(shots, `${variant}-${name}.png`), fullPage: true })
    }
    try {
      await waitSendReady(window)
      const composer = window.locator('[data-testid="composer-input"]')
      await composer.click()
      await window.keyboard.type(FIRST, { delay: 20 })
      await composer.press("Enter")
      await expect.poll(() => db().users.some((u) => u.content === FIRST), { timeout: 20_000 }).toBe(true)
      const sessionId = db().users.find((u) => u.content === FIRST)!.s
      await window.waitForTimeout(1_500)
      await queueWithImage(window, "带图插话", "steer.png")
      await shot("1-queued")
      const item = window.locator('[data-testid="queued-user-turn"]')
      if (variant === "send-now") {
        await item.getByRole("button", { name: "马上发给它" }).click()
        await expect
          .poll(() => db().users.find((u) => u.content === "带图插话")?.files ?? [], { timeout: 15_000 })
          .toEqual(["steer.png"])
        // 气泡里带着图（不是只剩文字）
        const bubble = window.locator('[data-chat-stage="true"] [data-thread-message]').filter({ hasText: "带图插话" })
        await expect(bubble.locator("img").first()).toBeVisible({ timeout: 8_000 })
      } else {
        await item.getByRole("button", { name: REMOVE_LABEL }).click()
        await expect(item).toHaveCount(0)
      }
      await expect.poll(() => db().drafts.filter((d) => d.session_id === sessionId).length, { timeout: 8_000 }).toBe(0)
      await shot("2-after")
      await switchAwayAndBack(window, sessionId)
      await expect(chip, "切回不冒只图草稿").toHaveCount(0)
      await shot("3-switched-back")
      expect(db().drafts.filter((d) => d.session_id === sessionId)).toEqual([])
      if (variant === "remove") expect(db().users.some((u) => u.content === "带图插话")).toBe(false)
    } finally {
      await shutdown(app)
    }
  })
}

test("主线决定（#136）：模型看不了图时「马上发给它」——留在队首、锁定提示，不弹 agent.steer 原始红卡", async () => {
  test.setTimeout(300_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  // 不开 ENJOY_E2E_STUB_VISION：stub 模型看不了图，纠偏编图会抛 model_needs_vision。
  const boot = freshEnv()
  const { app, window } = await launch(boot.env)
  const db = () => dump(boot.userData) as Dump
  try {
    await waitSendReady(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.click()
    await window.keyboard.type(FIRST, { delay: 20 })
    await composer.press("Enter")
    await expect.poll(() => db().users.some((u) => u.content === FIRST), { timeout: 20_000 }).toBe(true)
    await window.waitForTimeout(1_500)
    await queueWithImage(window, "带图插话", "noVision.png")
    const item = window.locator('[data-testid="queued-user-turn"]')
    await item.getByRole("button", { name: "马上发给它" }).click()
    await expect(window.getByText("它运行中收不了图，这条连图一起排到下一轮发。")).toBeVisible({ timeout: 10_000 })
    await expect(item.first()).toBeVisible()
    await expect(item.first()).toContainText("带图插话")
    await expect(window.getByText(/agent\.steer|model_needs_vision|Error invoking remote method/)).toHaveCount(0)
    expect(db().users.some((u) => u.content === "带图插话"), "没纠偏成功就不落库").toBe(false)
    mkdirSync(shots, { recursive: true })
    await window.screenshot({ path: join(shots, "41-vision-off-send-now-requeued.png"), fullPage: true })
  } finally {
    await shutdown(app)
  }
})
