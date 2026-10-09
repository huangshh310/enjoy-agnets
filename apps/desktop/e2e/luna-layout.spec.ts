/**
 * luna #120 must-fix：1440×920 / 1100 宽下对话 ≥200px，审批钮不被改动条盖住，
 * 会话行菜单锚在触发行附近。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")
const shots = "/opt/cursor/artifacts/screenshots"

test("审批卡让位对话且菜单锚在会话行", async () => {
  test.setTimeout(150_000)
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
  for (let i = 0; i < 4; i += 1) {
    writeFileSync(join(workspace, `dirty-${i}.txt`), `change ${i}\n`)
  }
  const app = await electron.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
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
    await resizeWindow(app, 1440, 920)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="permission-dock"]').waitFor({ timeout: 15_000 })
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-approval-1440.png") })

    await resizeWindow(app, 1100, 720)
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-approval-1100.png") })

    await resizeWindow(app, 1440, 920)
    const trigger = window.locator('[data-testid="session-row-menu"]').first()
    await trigger.click({ timeout: 8_000, force: true })
    const menu = window.locator('[data-testid="session-row-menu-content"]')
    await menu.waitFor({ timeout: 8_000 })
    const triggerBox = await trigger.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(triggerBox).toBeTruthy()
    expect(menuBox).toBeTruthy()
    if (triggerBox && menuBox) {
      expect(menuBox.y).toBeGreaterThan(40)
      const midTrigger = triggerBox.y + triggerBox.height / 2
      const midMenu = menuBox.y + menuBox.height / 2
      expect(Math.abs(midMenu - midTrigger)).toBeLessThan(120)
      expect(menuBox.x + menuBox.width).toBeGreaterThan(triggerBox.x - 8)
    }
    await expect(menu).toContainText("加星标")
    await window.screenshot({ path: join(shots, "luna-session-menu.png") })

    await window.keyboard.press("Escape")
    const deny = window.locator('[data-testid="approval-deny"]')
    if (await deny.count()) await deny.click()
    await sendComposer(window, composer, "desktop calendar click")
    await window.locator('[data-testid="desktop-approval-card"]').waitFor({ timeout: 15_000 })
    await assertApprovalLayout(window)
    await window.screenshot({ path: join(shots, "luna-desktop-approval-1440.png") })

    await window.getByLabel("展开改动面板").click({ timeout: 8_000 }).catch(async () => {
      await window.getByLabel("Expand pane").click({ timeout: 4_000 })
    })
    await window.getByText("终端", { exact: true }).click({ timeout: 8_000 })
    await window.locator("[data-terminal-pane]").waitFor({ timeout: 12_000 })
    await window.waitForFunction(() => document.body.innerText.includes("example.com/docs"), undefined, {
      timeout: 12_000
    })
    await window.screenshot({ path: join(shots, "luna-terminal-link.png") })
  } finally {
    await app.close().catch(() => undefined)
  }
})

async function resizeWindow(
  app: { evaluate: (fn: (electron: typeof import("electron"), size: { w: number; h: number }) => void, arg: { w: number; h: number }) => Promise<unknown> },
  w: number,
  h: number
) {
  await app.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.setSize(size.w, size.h)
  }, { w, h })
}

async function assertApprovalLayout(window: Page) {
  const conversation = window.locator('[data-testid="chat-conversation"]')
  await conversation.waitFor({ timeout: 8_000 })
  const convoBox = await conversation.boundingBox()
  expect(convoBox).toBeTruthy()
  expect(convoBox?.height ?? 0).toBeGreaterThanOrEqual(200)

  const live = window.locator('[data-testid="composer-live-changes"]')
  await expect(live).toHaveCount(0)

  const action = window.locator('[data-testid="approval-continue"], [data-testid="approval-allow"]').first()
  await action.waitFor({ timeout: 8_000 })
  const actionBox = await action.boundingBox()
  expect(actionBox).toBeTruthy()
  if (live && (await live.count()) > 0) {
    const liveBox = await live.boundingBox()
    if (actionBox && liveBox) {
      const overlap = !(
        actionBox.x + actionBox.width <= liveBox.x ||
        liveBox.x + liveBox.width <= actionBox.x ||
        actionBox.y + actionBox.height <= liveBox.y ||
        liveBox.y + liveBox.height <= actionBox.y
      )
      expect(overlap).toBe(false)
    }
  }
}
