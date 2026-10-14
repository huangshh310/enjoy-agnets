/**
 * jojo P1（#151 gate3）：A 里粘的图不能在切会话 / 重启时写进 B 的用户消息；A 的草稿附件还在。
 * 只粘了图的新会话（没打字）不是空壳：离开 / 重启都不删。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/attach-bind")
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

function q<T>(userData: string, sql: string, ...args: unknown[]): T[] {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    return db.prepare(sql).all(...(args as never[])) as T[]
  } finally {
    db.close()
  }
}

const fileAssetsOf = (userData: string, sid: string) =>
  q<{ payload: string }>(
    userData,
    "SELECT p.payload FROM message_parts p JOIN messages m ON m.id = p.message_id WHERE m.session_id = ? AND p.type = 'file'",
    sid
  ).map((r) => (JSON.parse(r.payload) as { assetId: string }).assetId)

async function skipSetup(window: Page) {
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
}

test("A 草稿里的图：切到 B / 重启 / 在 B 发送，都不进 B；A 的草稿附件和会话都还在", async () => {
  test.setTimeout(240_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-ab-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-ab-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const env = {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  }
  mkdirSync(shots, { recursive: true })
  let app = await relaunchElectron(env)
  try {
    let window = await firstWindow(app)
    await skipSetup(window)
    // B：一条纯文本用户消息
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "hello")
    await expect.poll(() => q<{ id: string }>(userData, "SELECT id FROM messages WHERE role='user'").length, { timeout: 20_000 }).toBe(1)
    const bId = q<{ session_id: string }>(userData, "SELECT session_id FROM messages WHERE role='user'")[0]!.session_id
    // A：新对话只粘图，不打字
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect.poll(() => q(userData, "SELECT id FROM sessions").length, { timeout: 10_000 }).toBe(2)
    const aId = q<{ id: string }>(userData, "SELECT id FROM sessions WHERE id != ?", bId)[0]!.id
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG })
    await window.waitForSelector('[data-testid="composer-asset-chip"]', { timeout: 8_000 })
    await expect.poll(() => q(userData, "SELECT 1 FROM session_draft_assets WHERE session_id = ?", aId).length, { timeout: 5_000 }).toBe(1)
    // 切到 B：A 不被当空壳删，B 不挂 A 的图
    await window.locator('[data-testid="sidebar-session-row"]', { hasText: "stub" }).first().click()
    await window.waitForTimeout(2_000)
    expect(q(userData, "SELECT id FROM sessions WHERE id = ?", aId).length).toBe(1)
    expect(fileAssetsOf(userData, bId)).toEqual([])
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(0)

    // 重启：启动清理不删 A；B 仍不挂 A 的图；在 B 发一条也不带
    await closeForRelaunch(app)
    app = await relaunchElectron(env)
    window = await firstWindow(app)
    await skipSetup(window)
    expect(q(userData, "SELECT id FROM sessions WHERE id = ?", aId).length).toBe(1)
    await window.locator('[data-testid="sidebar-session-row"]', { hasText: "stub" }).first().click()
    await window.waitForTimeout(1_500)
    expect(fileAssetsOf(userData, bId)).toEqual([])
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "again in B")
    await expect.poll(() => q(userData, "SELECT id FROM messages WHERE role='user' AND session_id = ?", bId).length, { timeout: 20_000 }).toBe(2)
    await window.waitForTimeout(1_500)
    expect(fileAssetsOf(userData, bId)).toEqual([])
    await window.screenshot({ path: join(shots, "attach-bind-B-no-A-image.png") })
    // 回到 A：草稿附件还在
    const rows = window.locator('[data-testid="sidebar-session-row"]')
    const n = await rows.count()
    for (let i = 0; i < n; i += 1) {
      await rows.nth(i).click()
      await window.waitForTimeout(800)
      const sid = await window.evaluate(() => document.querySelector('[data-testid="composer-asset-chip"]') !== null)
      if (sid) break
    }
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1)
    await window.screenshot({ path: join(shots, "attach-bind-A-draft-kept.png") })
    expect(fileAssetsOf(userData, aId)).toEqual([])
  } finally {
    await closeForRelaunch(app)
  }
})
