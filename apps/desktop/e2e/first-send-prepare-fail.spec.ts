/**
 * jojo P2（main-150）：开泵前失败（需视觉模型）→ run 落 failed，红卡在、「重新生成」不卡截断闸，重启红卡仍在。
 * ENJOY_E2E_PREPARE_FAIL=1 只在 stub 闸下生效。
 */
import { DatabaseSync } from "node:sqlite"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/prepare-fail")

function runStatuses(userData: string): Array<{ status: string; error: string | null }> {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    return db.prepare("SELECT status, error FROM runs").all() as Array<{ status: string; error: string | null }>
  } finally {
    db.close()
  }
}

async function skipSetup(window: Page): Promise<void> {
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
}

test("开泵前失败：红卡、库里 failed、重新生成不被截断闸挡、重启红卡仍在", async () => {
  test.setTimeout(240_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-pf-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-pf-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const env = {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_PREPARE_FAIL: "1"
  }
  mkdirSync(shots, { recursive: true })
  let app = await relaunchElectron(env)
  try {
    let window = await firstWindow(app)
    await skipSetup(window)
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "画一张猫")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toBeVisible({ timeout: 20_000 })
    await expect(banner).toContainText(/vision|视觉/)
    // 另有标题等后台 run 可能 completed；关键是用户这轮 failed+error，且没有卡在 running。
    await expect
      .poll(() => runStatuses(userData).filter((r) => r.status === "failed" && /vision-capable/.test(r.error ?? "")).length, { timeout: 10_000 })
      .toBe(1)
    expect(runStatuses(userData).filter((r) => r.status === "running" || r.status === "waiting_review")).toEqual([])
    await window.screenshot({ path: join(shots, "item1-red-card.png") })

    await banner.getByRole("button", { name: "重新生成" }).first().click()
    await expect
      .poll(() => runStatuses(userData).filter((r) => r.status === "failed").length, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(2)
    await expect(window.locator("body")).not.toContainText("还在运行或等你审批")
    await expect(banner).toBeVisible({ timeout: 20_000 })
    expect(runStatuses(userData).filter((r) => r.status === "running" || r.status === "waiting_review")).toEqual([])

    await closeForRelaunch(app)
    app = await relaunchElectron(env)
    window = await firstWindow(app)
    await skipSetup(window)
    const row = window.locator('[data-testid="sidebar-session-row"]').first()
    if ((await row.count()) > 0) await row.click()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-error-banner"]')).toContainText(/vision|视觉/)
    await window.screenshot({ path: join(shots, "item1-after-restart.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
