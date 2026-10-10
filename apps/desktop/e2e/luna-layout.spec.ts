/**
 * luna #120 must-fix：对话 ≥200px，审批钮不被改动条盖住，会话菜单锚在行附近。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("审批卡让位对话且菜单锚在会话行", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-luna-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-luna-ud-"))
  for (let i = 0; i < 4; i += 1) writeFileSync(join(workspace, `dirty-${i}.txt`), `change ${i}\n`)
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_CU_READY: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    await window.setViewportSize({ width: 1440, height: 920 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="permission-dock"]').waitFor({ timeout: 15_000 })
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-approval-1440.png") })

    await window.setViewportSize({ width: 1100, height: 720 })
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-approval-1100.png") })

    await window.setViewportSize({ width: 1440, height: 920 })
    const trigger = window.locator('[data-testid="session-row-menu"]').first()
    await trigger.waitFor({ state: "attached", timeout: 8_000 })
    await trigger.click({ force: true })
    const menu = window.locator('[data-testid="session-row-menu-content"]')
    await menu.waitFor({ timeout: 8_000 })
    const triggerBox = await trigger.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(triggerBox && menuBox).toBeTruthy()
    if (triggerBox && menuBox) {
      expect(menuBox.y).toBeGreaterThan(40)
      const midTrigger = triggerBox.y + triggerBox.height / 2
      const midMenu = menuBox.y + menuBox.height / 2
      expect(Math.abs(midMenu - midTrigger)).toBeLessThan(120)
    }
    await expect(menu).toContainText("加星标")
    await window.screenshot({ path: join(shots, "luna-session-menu.png") })
    await window.keyboard.press("Escape")

    const deny = window.locator('[data-testid="approval-deny"]')
    if ((await deny.count()) > 0) await deny.click()
    await sendComposer(window, composer, "desktop calendar click")
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ timeout: 15_000 })
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-desktop-approval-1440.png") })

    await openTerminal(window)
    await window.screenshot({ path: join(shots, "luna-terminal-link.png") })
  } finally {
    const proc = app.process()
    await Promise.race([app.close(), delay(1_500)]).catch(() => undefined)
    try {
      proc?.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
})

async function openTerminal(window: Page) {
  const expand = window.getByLabel("展开改动面板")
  if (await expand.count()) await expand.click()
  else await window.getByLabel("Expand changes pane").click({ timeout: 4_000 }).catch(() => undefined)
  const terminal = window.getByText("终端", { exact: true })
  if ((await terminal.count()) > 0) await terminal.click()
  await window.locator("[data-terminal-pane]").waitFor({ timeout: 12_000 }).catch(() => undefined)
  await window
    .waitForFunction(() => document.body.innerText.includes("example.com/docs"), undefined, { timeout: 8_000 })
    .catch(() => undefined)
}

async function assertApprovalLayout(window: Page) {
  const conversation = window.locator('[data-testid="chat-conversation"]')
  await conversation.waitFor({ timeout: 8_000 })
  const convoBox = await conversation.boundingBox()
  expect(convoBox?.height ?? 0).toBeGreaterThanOrEqual(200)
  await expect(window.locator('[data-testid="composer-live-changes"]')).toHaveCount(0)
  const action = window.locator('[data-testid="approval-continue"], [data-testid="approval-allow"]').first()
  await action.waitFor({ timeout: 8_000 })
  expect(await action.boundingBox()).toBeTruthy()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
