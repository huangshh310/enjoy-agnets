/**
 * 非 git 工作区：知识库行打开查看文件，不进「没有用 Git 管理」审查空态。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import type { ElectronApplication, Page } from "playwright"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

const FOOTER = "点文件可以在右侧打开；找不到的文件会就地展开片段。"

async function closeApp(app: ElectronApplication): Promise<void> {
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("close timeout")), 4_000)
      })
    ])
  } catch {
    app.process()?.kill("SIGKILL")
  }
}

async function waitSheetReady(window: Page) {
  const sheet = window.locator('[data-testid="turn-sources-sheet"]')
  await expect(sheet).toBeVisible({ timeout: 8_000 })
  await expect
    .poll(async () => (await sheet.boundingBox())?.width ?? 0, { timeout: 4_000 })
    .toBeGreaterThan(240)
  return sheet
}

async function assertPlainPreview(window: Page, path: string) {
  await expect
    .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.paneKind ?? ""), {
      timeout: 8_000
    })
    .toBe("files")
  await expect(window.locator('[data-testid="review-not-git-empty"]')).not.toBeVisible()
  await expect(window.getByText("这个文件夹没有用 Git 管理")).not.toBeVisible()
  await expect(window.locator('[data-testid="source-file-path"]').first()).toContainText(path)
  await expect(window.locator('[data-testid="source-file-view-mode"]').first()).toContainText("查看文件")
  const preview = window.locator('[data-testid="source-file-preview"]').first()
  await expect(preview).toBeVisible()
  await expect(preview).not.toContainText("@@")
  await expect(preview).not.toContainText("+")
  await expect(window.locator('[data-testid="source-file-diff"]')).toHaveCount(0)
}

test("非 git：知识库行打开查看文件，缺失展开，审查文件名可点", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-know-nongit-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  writeFileSync(join(workspace, "untracked.txt"), "hello knowledge\n")
  writeFileSync(join(workspace, "e2e-stub.txt"), "from stub\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello knowledge")
    const readmeChip = window.locator(
      '[data-testid="turn-source-chip-knowledge"][data-source-path="readme.md"]'
    )
    await expect(readmeChip).toBeVisible({ timeout: 20_000 })
    await readmeChip.click()
    const sheet = await waitSheetReady(window)
    await expect(sheet.getByText(FOOTER)).toBeVisible()
    await window.locator('[data-testid="turn-source-row"][data-path="readme.md"]').click()
    await expect(sheet).toBeHidden({ timeout: 8_000 })
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.path ?? ""), {
        timeout: 8_000
      })
      .toMatch(/readme\.md$/)
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.view ?? ""), {
        timeout: 4_000
      })
      .toBe("preview")
    await assertPlainPreview(window, "readme.md")
    const highlighted = window.locator('[data-source-highlight="true"]')
    await expect(highlighted).toHaveCount(2)
    await expect(highlighted.first()).toHaveAttribute("data-source-line", "1")
    await expect(window.locator('[data-source-line="3"][data-source-highlight="true"]')).toHaveCount(0)
    await snap(window, "knowledge-source-file-preview-nongit")

    await readmeChip.click()
    await waitSheetReady(window)
    await window.evaluate(() => {
      window.__enjoyE2e?.injectSheetChip({
        id: "gone.md:1",
        kind: "knowledge",
        label: "gone.md",
        path: "gone.md",
        startLine: 1,
        snippet: "already deleted"
      })
    })
    const goneRow = window.locator('[data-testid="turn-source-row"][data-path="gone.md"]')
    await expect(goneRow).toBeVisible()
    await goneRow.click()
    await expect(sheet).toBeVisible()
    await expect(goneRow).toHaveAttribute("data-expanded", "true")
    await expect(window.locator('[data-testid="turn-source-snippet"]')).toContainText("already deleted")
    await snap(window, "knowledge-source-drawer-expand-nongit")
    await sheet.getByRole("button", { name: "关闭" }).click()
    await expect(sheet).toBeHidden({ timeout: 8_000 })

    await window.evaluate(() => {
      window.__enjoyE2e?.injectThisTurnWrite("e2e-stub.txt")
    })
    await window.keyboard.press("Control+Shift+G")
    const empty = window.locator('[data-testid="review-not-git-empty"]')
    await expect(empty).toBeVisible({ timeout: 8_000 })
    await expect(empty).toContainText("这个文件夹没有用 Git 管理")
    const stubRow = empty.locator('[data-testid="review-not-git-file"][data-path="e2e-stub.txt"]')
    await expect(stubRow).toBeVisible()
    await stubRow.click()
    await assertPlainPreview(window, "e2e-stub.txt")
    await snap(window, "knowledge-source-review-nongit-click")
  } finally {
    await closeApp(app)
  }
})
