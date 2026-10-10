/**
 * jojo #128 合后行为：@ 芯片全选删除、733×480 @ 浮层避让标题栏、归档框居中、待验收不缩。
 */
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"

test("芯片全选删除、小窗 @ 浮层、归档框居中、待验收不缩", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-jojo128-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  writeFileSync(join(workspace, "notes.md"), "notes\n")
  writeFileSync(join(workspace, "app.ts"), "export {}\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    await assertChipSelectAllDeletes(window, composer)
    await assertMentionFitsSmallWindow(window, composer)
    await assertArchiveDialogCentered(window)
    await assertReviewStatusDoesNotShrink(window)
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
  }
})

async function assertChipSelectAllDeletes(window: Page, composer: ReturnType<Page["locator"]>) {
  await window.setViewportSize({ width: 1440, height: 900 })
  await composer.click()
  await composer.fill("")
  await composer.press("@")
  await expect(window.getByTestId("composer-mention-list")).toBeVisible({ timeout: 8_000 })
  const fileRow = window.getByTestId("composer-mention-item").filter({ hasText: "readme.md" }).first()
  if ((await fileRow.count()) > 0) await fileRow.click()
  else await window.keyboard.press("Enter")
  const chip = window.getByTestId("composer-quote-chip")
  await expect(chip).toBeVisible({ timeout: 8_000 })
  await snap(window, "jojo128-chip-before-delete")
  await composer.click()
  await composer.press("Control+A")
  await composer.press("Backspace")
  await expect(chip).toHaveCount(0, { timeout: 8_000 })
  await snap(window, "jojo128-chip-after-delete")
}

async function assertMentionFitsSmallWindow(window: Page, composer: ReturnType<Page["locator"]>) {
  await window.setViewportSize({ width: 733, height: 480 })
  await composer.click()
  await composer.fill("")
  await composer.press("@")
  const popover = window.getByTestId("composer-mention-popover")
  await expect(popover).toBeVisible({ timeout: 8_000 })
  const box = await popover.boundingBox()
  const viewport = await window.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(box).toBeTruthy()
  if (box) {
    expect(box.y).toBeGreaterThanOrEqual(40)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5)
    expect(box.x).toBeGreaterThanOrEqual(-0.5)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5)
  }
  await snap(window, "jojo128-mention-733x480")
  await composer.press("Escape")
}

async function assertArchiveDialogCentered(window: Page) {
  await window.setViewportSize({ width: 1440, height: 900 })
  await window.evaluate(() => window.__enjoyE2e?.openArchiveGuard())
  const panel = window.getByTestId("confirm-dialog-panel")
  await expect(panel).toBeVisible({ timeout: 8_000 })
  await expect(window.getByText("这条对话还有一个操作等你决定")).toBeVisible()
  await snap(window, "jojo128-archive-dialog-centered")
  const box = await panel.boundingBox()
  const viewport = await window.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  expect(box).toBeTruthy()
  if (box) {
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2
    expect(Math.abs(centerX - viewport.width / 2), `x ${centerX} vs ${viewport.width / 2}`).toBeLessThan(48)
    expect(Math.abs(centerY - viewport.height / 2), `y ${centerY} vs ${viewport.height / 2}`).toBeLessThan(48)
  }
  await window.getByRole("button", { name: "取消" }).click()
  await expect(panel).toHaveCount(0, { timeout: 8_000 })
}

async function assertReviewStatusDoesNotShrink(window: Page) {
  await window.setViewportSize({ width: 1100, height: 720 })
  const sessionId = await window.evaluate(() => window.__enjoyE2e?.getComposerGate()?.sessionId ?? null)
  if (!sessionId) {
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getComposerGate()?.sessionId ?? null), {
        timeout: 12_000
      })
      .toBeTruthy()
  }
  await window.evaluate(() => {
    window.__enjoyE2e?.setReviewChrome({
      title: "很长的会话题用来验收截断行为不要挤扁待验收".repeat(4),
      workflowStatus: "needs_review",
      rightPanelCollapsed: false
    })
  })
  const gate = window.getByTestId("review-gate-phases")
  await expect(gate).toBeVisible({ timeout: 8_000 })
  await expect(gate).toContainText("待验收")
  const title = window.getByTestId("chat-breadcrumb-title")
  const header = window.locator("header").filter({ has: gate })
  const gateBox = await gate.boundingBox()
  const headerBox = await header.boundingBox()
  expect(gateBox && headerBox).toBeTruthy()
  if (gateBox && headerBox) {
    expect(gateBox.x + gateBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1)
    expect(gateBox.y).toBeGreaterThanOrEqual(headerBox.y - 1)
  }
  const truncated = await title.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(truncated).toBe(true)
  await snap(window, "jojo128-review-status-no-shrink")
}
