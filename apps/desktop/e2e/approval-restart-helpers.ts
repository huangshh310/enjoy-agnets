/**
 * 重启回挂 e2e 共用：同一 userData 起 stub、SIGKILL、抹检查点 / 篡 HMAC。
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { expect, type ElectronApplication, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

export const mainEntry = join(process.cwd(), "out/main/index.js")
export const stubPath = (workspace: string) => join(workspace, "e2e-stub.txt")
const launchArgs = [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]

export type RestartEnv = {
  workspace: string
  userData: string
  env: NodeJS.ProcessEnv
}

export async function bootPendingApproval(opts?: {
  slowTool?: boolean
}): Promise<RestartEnv & { app: ElectronApplication }> {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const env = {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ...(opts?.slowTool ? { ENJOY_E2E_SLOW_TOOL: "1" } : {})
  }
  const app = await launchElectron(env)
  try {
    const window = await firstWindow(app)
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "please write a note")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible()
    await expect(window.locator("body")).toContainText("e2e-stub.txt")
  } catch (error) {
    await closeForRelaunch(app)
    throw error
  }
  return { app, workspace, userData, env }
}

export async function relaunchElectron(env: NodeJS.ProcessEnv): Promise<ElectronApplication> {
  return launchElectron(env)
}

/** 等审批时 app.close() 会撞 before-quit 确认框，必须 forceQuit，否则 CI 挂满 180s。 */
export async function closeForRelaunch(app: ElectronApplication): Promise<void> {
  try {
    for (const window of app.windows()) {
      await window
        .evaluate(async () => {
          const quit = (
            globalThis as { ide?: { window?: { forceQuit?: () => Promise<unknown> } } }
          ).ide?.window?.forceQuit
          if (quit) await quit()
        })
        .catch(() => undefined)
    }
  } catch {
    /* already gone */
  }
  await Promise.race([app.close(), delay(5_000)]).catch(() => undefined)
  await crashKill(app)
}

export async function firstWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
  return window
}

export async function expectDecidableCard(window: Page): Promise<void> {
  await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
  await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible({ timeout: 20_000 })
  await expect(window.locator('[data-testid="approval-allow"]')).toBeVisible()
  await expect(window.locator('[data-testid="approval-deny"]')).toBeVisible()
  await expect(window.locator("body")).toContainText("e2e-stub.txt")
  await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
  await expect(window.locator("body")).not.toContainText("重启后对不上原来的审批")
}

export async function expectApprovalInboxCleared(window: Page): Promise<void> {
  await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0)
  await expect(window.locator("body")).not.toContainText("立即前往审批")
  await openInbox(window)
  await expect(window.locator('[data-testid="page-inbox"]')).toBeVisible()
  await expect(window.locator("body")).not.toContainText("立即前往审批")
}

export async function crashKill(app: ElectronApplication): Promise<void> {
  let proc: ReturnType<ElectronApplication["process"]> | null = null
  try {
    proc = app.process()
  } catch {
    return
  }
  const pid = proc?.pid
  if (pid) {
    try {
      process.kill(pid, "SIGKILL")
    } catch {
      /* already gone */
    }
  }
  await Promise.race([waitExit(proc), delay(3_000)]).catch(() => undefined)
  // SIGKILL 之后 Playwright 的 Electron 句柄常收不掉，裸 await app.close() 会挂满 180s。
  await Promise.race([app.close(), delay(3_000)]).catch(() => undefined)
}

/** 不可回挂：抹掉 waiting_review 检查点。库路径 `$ENJOY_E2E_USERDATA/app.db`。 */
export function wipeWaitingCheckpoints(userData: string): void {
  mutateAppDb(userData, (db) => {
    db.exec("UPDATE runs SET checkpoint = NULL WHERE status = 'waiting_review'")
  })
}

/** 不可回挂：篡 HMAC，启动时 partitionHmacPending 失败并结清停止。 */
export function tamperWaitingHmac(userData: string): void {
  mutateAppDb(userData, (db) => {
    db.exec("UPDATE approvals SET hmac = 'tampered' WHERE decision IS NULL")
  })
}

export async function openInbox(window: Page): Promise<void> {
  await window.evaluate(() => {
    window.location.hash = "#/inbox"
  })
  await window.locator('[data-testid="page-inbox"]').waitFor({ timeout: 10_000 })
}

function mutateAppDb(userData: string, fn: (db: DatabaseSync) => void): void {
  const dbPath = join(userData, "app.db")
  if (!existsSync(dbPath)) return
  const db = new DatabaseSync(dbPath)
  try {
    fn(db)
  } finally {
    db.close()
  }
}

async function launchElectron(env: NodeJS.ProcessEnv): Promise<ElectronApplication> {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    const { test } = await import("@playwright/test")
    test.skip(true, "playwright electron launcher unavailable")
    throw new Error("unreachable")
  }
  return electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env
  })
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

export function readStub(workspace: string): string {
  return readFileSync(stubPath(workspace), "utf8")
}

/** 终态 run 不得再 waiting_review / running；助手工具必须是收工态。 */
export function expectFinishedRunsSettled(userData: string): void {
  mutateAppDb(userData, (db) => {
    const open = db
      .prepare("SELECT id, status FROM runs WHERE status IN ('running', 'waiting_review')")
      .all() as Array<{ id: string; status: string }>
    expect(open, `unfinished runs: ${JSON.stringify(open)}`).toEqual([])
    const rows = db
      .prepare("SELECT content FROM messages WHERE role = 'assistant'")
      .all() as Array<{ content: string }>
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const tools = toolsFromAssistantContent(row.content)
      for (const tool of tools) {
        expect(
          ["output-available", "output-denied", "output-error"].includes(tool.state),
          `tool ${tool.id} still ${tool.state}`
        ).toBe(true)
      }
    }
  })
}

export async function expectSettledFinishedTurns(window: Page): Promise<void> {
  await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
  await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="chat-conversation"] [class*="animate-spin"]')).toHaveCount(0)
  await expect(window.locator("body")).not.toContainText("已运行 1 个工具 · 运行命令 · 失败")
  await expect(window.locator('[data-testid="turn-changed-files"]')).toBeVisible()
  await expect(window.locator("body")).toContainText("e2e-stub.txt")
  await expect(window.locator("body")).not.toContainText("0 tok")
}

function toolsFromAssistantContent(content: string): Array<{ id: string; state: string }> {
  try {
    const parsed = JSON.parse(content) as { tools?: Array<{ id?: string; state?: string }> }
    return (parsed.tools ?? []).map((tool) => ({
      id: String(tool.id ?? ""),
      state: String(tool.state ?? "")
    }))
  } catch {
    return []
  }
}
