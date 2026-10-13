/**
 * luna P2（g152）：点「新对话」后不发，切回别的会话 → 空壳当场删（库 + 侧栏），不用等重启。
 * 输入框有字的空会话离开时保留（leo fail-closed）。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/leave-empty")

function sessionIds(userData: string): string[] {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    return (db.prepare("SELECT id FROM sessions").all() as Array<{ id: string }>).map((r) => r.id)
  } finally {
    db.close()
  }
}

async function currentSessionId(window: Page): Promise<string | null> {
  return window.evaluate(() => {
    const w = globalThis as { __enjoyChatStore?: { getState: () => { sessionId: string | null } } }
    return w.__enjoyChatStore?.getState().sessionId ?? null
  })
}

test("离开空「新对话」当场删；输入框有字的保留", async () => {
  test.setTimeout(180_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-le-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-le-ud-"))
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
  const app = await relaunchElectron(env)
  try {
    const window = await firstWindow(app)
    const skip = window.getByRole("button", { name: "跳过设置" })
    if ((await skip.count()) > 0) await skip.click()
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "hello")
    const rows = window.locator('[data-testid="sidebar-session-row"]')
    await expect.poll(() => rows.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(1)
    await expect.poll(() => sessionIds(userData).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1)
    await window.waitForTimeout(1_500)
    const before = sessionIds(userData)
    void currentSessionId

    // 1) 新对话 → 不发 → 点回老会话：空壳当场从库和侧栏消失。
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect.poll(() => sessionIds(userData).length, { timeout: 10_000 }).toBe(before.length + 1)
    const emptyId = sessionIds(userData).find((id) => !before.includes(id))!
    await expect.poll(() => rows.count(), { timeout: 10_000 }).toBe(before.length + 1)
    await window.screenshot({ path: join(shots, "leave-empty-before.png") })
    await rows.last().click()
    await expect.poll(() => sessionIds(userData).includes(emptyId), { timeout: 10_000 }).toBe(false)
    await expect.poll(() => rows.count(), { timeout: 10_000 }).toBe(before.length)
    await window.screenshot({ path: join(shots, "leave-empty-deleted.png") })

    // 2) 新对话 → 打了字没发 → 离开：保留。
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect.poll(() => sessionIds(userData).length, { timeout: 10_000 }).toBe(before.length + 1)
    const typedId = sessionIds(userData).find((id) => !before.includes(id))!
    await window.locator('[data-testid="composer-input"]').click()
    await window.keyboard.type("还没发的稿", { delay: 15 })
    await rows.last().click()
    await window.waitForTimeout(2_000)
    expect(sessionIds(userData)).toContain(typedId)
    await window.screenshot({ path: join(shots, "leave-typed-kept.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
