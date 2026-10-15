/**
 * luna main-155 巡检 P2（patrol-16/17）：会话右侧刻度 ThreadPreviewRail 外框约 256×256、pointer-events:auto，
 * 透明处也吃掉点击。1100 宽下用户消息的编辑 / 从这里重来 / 复制、编辑框的保存 / 取消，真实鼠标点都没反应。
 * 出现条件：会话里 ≥2 条带文字的用户消息、且没有本轮账本（没改文件）。
 * 断言：真实鼠标 page.mouse.click 坐标点击（不 force）都生效；elementFromPoint 命中的就是按钮本身；
 * 刻度按钮不与消息操作按钮 / 编辑框重叠。截图：设 ENJOY_E2E_SHOTS_DIR 时落盘。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Locator, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR
type Box = { x: number; y: number; width: number; height: number }

test("1100 宽、两条带字用户消息、无账本：右侧刻度不吃点击，编辑/复制/保存/取消真实鼠标都生效", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-rail-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-rail-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  })
  try {
    const window = await firstWindow(app)
    await window.setViewportSize({ width: 1100, height: 720 })
    const composer = window.locator('[data-testid="composer-input"]')
    for (const text of ["第一句 alpha", "第二句 beta"]) {
      await sendComposer(window, composer, text)
      await expect(window.locator("body")).toContainText(`stub-ok ${text}`, { timeout: 20_000 })
      await expect(window.locator('[data-testid="composer-send"]')).toHaveAttribute("aria-label", /Send|发送/, {
        timeout: 20_000
      })
    }
    // 刻度出现：两条带字用户消息、没有本轮账本。
    const ticks = window.locator('[data-slot="preview-rail-item"]')
    await expect(ticks).toHaveCount(2, { timeout: 10_000 })
    await expect(window.locator('[data-testid="turn-changed-files"]')).toHaveCount(0)
    await window.waitForTimeout(600)

    // 按消息 id 锁定：编辑框里改了字以后 hasText 就对不上了。
    const messageId = await window
      .locator("[data-thread-message]")
      .filter({ hasText: "第二句 beta" })
      .first()
      .getAttribute("data-thread-message")
    expect(messageId).toBeTruthy()
    const message = window.locator(`[data-thread-message="${messageId}"]`)
    const rail = window.locator('nav[aria-label="会话位置"]').locator("xpath=..")
    const railBox = await box(rail)
    const edit = message.getByRole("button", { name: "编辑消息" })
    const copy = message.getByRole("button", { name: "复制消息" })
    const rewind = message.getByRole("button", { name: /从这里重来|重来/ })
    await message.hover()
    // 前提：这些按钮确实落在刻度外框里，否则测不到被吃点击。
    const editBox = await box(edit)
    expect(intersects(editBox, railBox), `edit not under rail box ${JSON.stringify({ editBox, railBox })}`).toBe(true)
    await expectTicksClear(ticks, [edit, copy, rewind], "actions")
    for (const [name, button] of [["edit", edit], ["copy", copy], ["rewind", rewind]] as const) {
      expect(await hitsSelf(button), `${name}: elementFromPoint not the button`).toBe(true)
    }
    await snap(window, "1100x720-rail-actions")

    // 复制：真实鼠标点，剪贴板拿到正文。
    await app.evaluate(({ clipboard }) => clipboard.writeText(""))
    await clickCenter(window, copy)
    await expect.poll(() => readClipboard(app), { timeout: 5_000 }).toBe("第二句 beta")

    // 编辑 → 取消。
    await clickCenter(window, edit)
    const editor = message.locator("textarea")
    await expect(editor).toBeVisible({ timeout: 5_000 })
    const cancel = message.getByRole("button", { name: "取消" })
    const save = message.getByRole("button", { name: "保存并重新发送" })
    await expectTicksClear(ticks, [editor, cancel, save], "editor")
    expect(await hitsSelf(cancel), "cancel: elementFromPoint not the button").toBe(true)
    expect(await hitsSelf(save), "save: elementFromPoint not the button").toBe(true)
    await snap(window, "1100x720-rail-editor")
    await clickCenter(window, cancel)
    await expect(editor).toHaveCount(0, { timeout: 5_000 })
    await expect(message).toContainText("第二句 beta")

    // 编辑 → 改字 → 保存并重新发送。
    await message.hover()
    await clickCenter(window, edit)
    await expect(editor).toBeVisible({ timeout: 5_000 })
    await editor.fill("第二句 gamma")
    await clickCenter(window, save)
    await expect(window.locator("body")).toContainText("stub-ok 第二句 gamma", { timeout: 20_000 })
    await expect(window.locator("[data-thread-message]").filter({ hasText: "第二句 gamma" })).not.toHaveCount(0)
    await snap(window, "1100x720-rail-after-save")
  } finally {
    await closeForRelaunch(app)
  }
})

async function clickCenter(window: Page, locator: Locator): Promise<void> {
  const b = await box(locator)
  await window.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await window.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
}

async function hitsSelf(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return !!hit && (hit === el || el.contains(hit))
  })
}

async function expectTicksClear(ticks: Locator, targets: Locator[], label: string): Promise<void> {
  const tickBoxes = await Promise.all((await ticks.all()).map((tick) => box(tick)))
  for (const target of targets) {
    const t = await box(target)
    for (const tick of tickBoxes) {
      expect(intersects(t, tick), `${label}: rail tick overlaps content ${JSON.stringify({ t, tick })}`).toBe(false)
    }
  }
}

async function readClipboard(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ clipboard }) => clipboard.readText())
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value).toBeTruthy()
  return value as Box
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
