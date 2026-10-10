/**
 * 重启后 HMAC 通过的 waiting 审批必须把卡重新发出，不能只剩 Inbox 幽灵行。
 * kill -9 / 检查点没刷上：结清停止，中性条 + 重新发送，Inbox 空。
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { expect, test, type ElectronApplication, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const stubPath = (workspace: string) => join(workspace, "e2e-stub.txt")
const launchArgs = [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]

test("重启后待审批卡还在，Inbox 不再是幽灵行", async () => {
  test.setTimeout(180_000)
  const env = await bootPendingApproval()
  await relaunchAndExpectDecidableCard(env)
})

test("kill-9 且检查点已刷上：卡仍可批", async () => {
  test.setTimeout(180_000)
  const env = await bootPendingApproval()
  await crashKill(env.app)
  await relaunchAndExpectDecidableCard({ ...env, app: undefined })
})

test("kill-9 且检查点没刷上：结清停止，Inbox 空，重新发送回填", async () => {
  test.setTimeout(180_000)
  const env = await bootPendingApproval()
  await crashKill(env.app)
  wipeWaitingCheckpoints(env.userData)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const second = await electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env: env.env
  })
  try {
    const window = await second.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="thread-notice-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("已停止")
    await expect(window.locator("body")).toContainText("重启后对不上原来的审批，这一轮已结束。")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await window.locator('[data-testid="thread-resend"]').click()
    await expect(composer).toHaveValue("please write a note")
    await openInbox(window)
    await expect(window.locator("body")).not.toContainText("立即前往审批")
    await expect(window.locator('[data-testid="page-inbox"]')).toBeVisible()
  } finally {
    await second.close()
  }
})

async function bootPendingApproval(): Promise<{
  app: ElectronApplication
  workspace: string
  userData: string
  env: NodeJS.ProcessEnv
}> {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    throw new Error("unreachable")
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const env = {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  }
  const app = await electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible()
    await expect(window.locator("body")).toContainText("e2e-stub.txt")
  } catch (error) {
    await app.close()
    throw error
  }
  return { app, workspace, userData, env }
}

async function relaunchAndExpectDecidableCard(input: {
  workspace: string
  userData: string
  env: NodeJS.ProcessEnv
  app?: ElectronApplication
}): Promise<void> {
  if (input.app) await input.app.close()
  expect(existsSync(stubPath(input.workspace))).toBe(false)
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const second = await electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env: input.env
  })
  try {
    const window = await second.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="approval-allow"]')).toBeVisible()
    await expect(window.locator("body")).toContainText("e2e-stub.txt")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("重启后对不上原来的审批")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect
      .poll(() => existsSync(stubPath(input.workspace)), { timeout: 20_000 })
      .toBe(true)
    expect(readFileSync(stubPath(input.workspace), "utf8")).toContain("from stub")
  } finally {
    await second.close()
  }
}

async function crashKill(app: ElectronApplication): Promise<void> {
  const proc = app.process()
  const pid = proc?.pid
  if (pid) {
    try {
      process.kill(pid, "SIGKILL")
    } catch {
      /* already gone */
    }
  }
  await Promise.race([waitExit(proc), delay(3_000)]).catch(() => undefined)
  try {
    await app.close()
  } catch {
    /* already dead */
  }
}

function wipeWaitingCheckpoints(userData: string): void {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return
  const db = new DatabaseSync(dbPath)
  try {
    db.exec("UPDATE runs SET checkpoint = NULL WHERE status = 'waiting_review'")
  } finally {
    db.close()
  }
}

async function openInbox(window: Page): Promise<void> {
  await window.evaluate(() => {
    window.location.hash = "#/inbox"
  })
  await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 10_000 })
}

function waitExit(proc: { once?: (event: string, fn: () => void) => void } | null): Promise<void> {
  return new Promise((resolve) => {
    if (!proc?.once) {
      resolve()
      return
    }
    proc.once("exit", () => resolve())
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
