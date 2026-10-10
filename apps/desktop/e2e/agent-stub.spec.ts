/**
 * 无真实 Key 的窗口流：stub 发聊天、停止、刷新恢复、审批、知识索引、工作流、导入资产。
 */
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("stub Agent：发送、停止、恢复、审批、知识、工作流、导入", async () => {
  const app = await launchStubApp("# e2e workspace\nhello knowledge\n", 180_000)
  if (!app) return
  try {
    const window = await readyWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello stub")
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("attached body")
    })
    await window.waitForSelector('[data-testid="composer-asset-chip"]', { timeout: 8_000 })
    await sendComposer(window, composer, "read this")
    await window.waitForFunction(() => document.body.innerText.includes("attached:note.txt"), undefined, {
      timeout: 20_000
    })

    await sendComposer(window, composer, "please go slow now")
    await window.waitForSelector('[data-testid="composer-stop"]', { timeout: 8_000 })
    await window.locator('[data-testid="composer-stop"]').click()
    await window.locator('[data-testid="composer-stop"]').waitFor({ state: "detached", timeout: 8_000 })

    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
      timeout: 15_000
    })

    await window.reload()
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.locator('[data-testid="message-more"]').first().click({ timeout: 8_000 })
    await window.locator('[data-testid="extract-object"]').click({ timeout: 8_000 })
    await window.waitForFunction(() => document.body.innerText.includes("stub-card"), undefined, {
      timeout: 12_000
    })

    await window.evaluate(() => {
      location.hash = "#/observability"
    })
    await window.waitForFunction(() => document.body.innerText.includes("TTFO"), undefined, {
      timeout: 8_000
    })

    await window.evaluate(() => {
      location.hash = "#/knowledge"
    })
    await window.waitForSelector('[data-testid="knowledge-add-index"]', { timeout: 8_000 })
    await window.locator('[data-testid="knowledge-add-index"]').click()
    await window.locator('[data-testid="knowledge-index-root"]').click({ timeout: 8_000 })
    await window.locator('[data-testid="knowledge-index-confirm"]').click()
    await window.locator('[data-testid="knowledge-index-confirm"]').waitFor({ state: "detached", timeout: 15_000 })
    const search = window.locator('[data-testid="knowledge-search-input"]')
    await search.fill("hello knowledge")
    await window.locator('[data-testid="knowledge-search-submit"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("readme.md"), undefined, {
      timeout: 15_000
    })

    await window.evaluate(() => {
      location.hash = "#/"
    })
    await composer.waitFor({ timeout: 12_000 })
    await sendComposer(window, composer, "hello knowledge")
    await window.waitForFunction(() => document.body.innerText.includes("readme.md"), undefined, {
      timeout: 20_000
    })

    await window.evaluate(() => {
      location.hash = "#/workflows"
    })
    await window.waitForSelector('[data-testid="workflow-start"]', { timeout: 8_000 })
    if ((await window.locator('[data-testid="workflow-dag"]').count()) === 0) {
      await window.locator('[data-testid="workflow-create"]').click()
      await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 8_000 })
    }
    await window.locator('[data-testid="workflow-start"]').click()
    await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 12_000 })

    await window.evaluate(() => {
      location.hash = "#/media"
    })
    await window.waitForSelector('[data-testid="page-media"]', { timeout: 8_000 })
    await window.locator('[data-testid="media-file-input"]').setInputFiles({
      name: "e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("imported")
    })
    await window.waitForFunction(() => document.body.innerText.includes("e2e.txt"), undefined, {
      timeout: 12_000
    })
    const card = window.locator("article").filter({ hasText: "e2e.txt" }).first()
    await card.click()
    await card.getByTestId("asset-export").click({ force: true })
    await window.waitForFunction(
      () => document.body.innerText.includes("Exported to") || document.body.innerText.includes("已导出到"),
      undefined,
      { timeout: 12_000 }
    )
    await window.getByRole("button", { name: /STT & Audio|语音转写/ }).click()
    await window.waitForFunction(
      () => document.body.innerText.includes("Translate") || document.body.innerText.includes("翻译"),
      undefined,
      { timeout: 8_000 }
    )

    await window.evaluate(() => {
      location.hash = "#/mcp"
    })
    await window.waitForSelector('[data-testid="mcp-add-server"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-add-server"]').click()
    await window.locator('[data-testid="mcp-save-server"]').click({ timeout: 8_000 })
    await window.locator('[data-testid="mcp-save-server"]').waitFor({ state: "detached", timeout: 8_000 })
    await window.locator('[data-testid="mcp-trust"]').click()
    await window.locator('[data-testid="mcp-trust-confirm"]').click()
    await window.waitForSelector('[data-testid="mcp-open-app"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-open-app"]').click()
    await window.waitForSelector('[data-testid="mcp-app-frame"]', { timeout: 15_000 })
    const appFrame = window.frameLocator('[data-testid="mcp-app-frame"]')
    await appFrame.locator('[data-testid="mcp-app-ready"]').waitFor({ timeout: 8_000 })
    await appFrame.locator('[data-testid="mcp-app-log"]').evaluate((el: HTMLElement) => el.click())
    await expect(window.locator('[data-testid="mcp-app-log-text"]')).toContainText("app-log-ok", {
      timeout: 12_000
    })
  } finally {
    await closeApp(app)
  }
})

test("本会话总是允许：同会话跨轮不弹卡，新会话与归档后仍要问", async () => {
  const app = await launchStubApp("# e2e session allow\n", 180_000, { lang: "zh" })
  if (!app) return
  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 900 })
    const composer = window.locator('[data-testid="composer-input"]')
    await sendWriteAndAllowSession(window, composer)
    const firstId = await firstSessionId(window)
    expect(firstId.length).toBeGreaterThan(0)

    await sendWriteExpectExecuted(window, composer)
    await sendWriteExpectExecuted(window, composer)

    await window.locator('[data-testid="sidebar-new-session"]').click()
    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-session"]')).toBeVisible({ timeout: 20_000 })
    await window.locator('[data-testid="approval-deny"]').click({ timeout: 8_000, force: true })
    await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0, { timeout: 12_000 })

    // 新会话先关卡再归档：归档必须清掉第一会话的 allow，恢复后再问。
    await archiveSessionById(window, firstId)
    await window.evaluate(() => {
      location.hash = "#/settings/archived"
    })
    await expect(window.getByText("已归档的聊天").first()).toBeVisible({ timeout: 8_000 })
    await window.locator('[data-testid="archived-row-restore"]').click({ timeout: 8_000 })
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await expect(sessionRowById(window, firstId)).toBeVisible({ timeout: 8_000 })
    await sessionRowById(window, firstId).click()
    await sendComposer(window, composer, "please write a note")
    await expect(window.locator('[data-testid="approval-session"]')).toBeVisible({ timeout: 20_000 })
  } finally {
    await closeApp(app)
  }
})

async function launchStubApp(
  readme: string,
  timeoutMs = 90_000,
  opts?: { lang?: "zh" | "en" }
): Promise<ElectronApplication | null> {
  test.setTimeout(timeoutMs)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return null
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-"))
  writeFileSync(join(workspace, "readme.md"), readme)
  return electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ...(opts?.lang ? { ENJOY_E2E_LANG: opts.lang } : {})
    }
  })
}

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow({ timeout: 45_000 })
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  await window
    .locator('button:has-text("跳过设置"), button:has-text("Skip setup"), [data-testid="composer-input"]')
    .first()
    .waitFor({ timeout: 20_000 })
  const skipGuide = window.getByRole("button", { name: /跳过设置|Skip setup/ })
  if ((await skipGuide.count()) > 0) await skipGuide.click()
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
  return window
}

async function sendWriteAndAllowSession(window: Page, composer: ReturnType<Page["locator"]>) {
  await sendComposer(window, composer, "please write a note")
  await window.locator('[data-testid="approval-session"]').click({ timeout: 15_000, force: true })
  await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
    timeout: 15_000
  })
}

async function sendWriteExpectExecuted(window: Page, composer: ReturnType<Page["locator"]>) {
  const before = await countAllowedWrite(window)
  await sendComposer(window, composer, "please write a note")
  await window.waitForFunction(
    (prev) => (document.body.innerText.match(/stub-ok allowed write/g)?.length ?? 0) > prev,
    before,
    { timeout: 15_000 }
  )
  await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
  await expect(window.locator('[data-testid="approval-session"]')).toHaveCount(0)
}

async function countAllowedWrite(window: Page): Promise<number> {
  return window.evaluate(() => document.body.innerText.match(/stub-ok allowed write/g)?.length ?? 0)
}

async function firstSessionId(window: Page): Promise<string> {
  const row = window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]').first()
  await expect(row).toBeVisible({ timeout: 8_000 })
  return (await row.getAttribute("data-session-id")) ?? ""
}

function sessionRowById(window: Page, sessionId: string) {
  return window.locator(
    `[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${sessionId}"]`
  )
}

async function archiveSessionById(window: Page, sessionId: string) {
  const row = sessionRowById(window, sessionId)
  await row.scrollIntoViewIfNeeded()
  await row.hover()
  await row.locator('[data-testid="session-row-menu"]').click()
  await window.locator('[data-testid="session-row-menu-archive"]').click()
  const confirm = window.locator('[data-testid="confirm-dialog-confirm"]')
  if ((await confirm.count()) > 0) await confirm.click()
  await expect(window.locator('[data-testid="session-archived-toast"]')).toBeVisible({ timeout: 12_000 })
}

async function closeApp(app: ElectronApplication) {
  const proc = app.process()
  await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
  try {
    proc?.kill("SIGKILL")
  } catch {
    /* already gone */
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
