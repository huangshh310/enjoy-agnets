/**
 * 知识库来源芯片：点开「本轮来源」抽屉选中该行，渲染进程不崩。
 * stub 启动会索引工作区 `.`（readme.md · hello knowledge）。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

test("点知识库来源芯片打开本轮来源且选中该行", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-know-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello knowledge")
    const chip = window.locator('[data-testid="turn-source-chip-knowledge"]')
    await expect(chip).toBeVisible({ timeout: 20_000 })
    await snap(window, "knowledge-source-chip")
    await chip.click()
    const sheet = window.locator('[data-testid="turn-sources-sheet"]')
    await expect(sheet).toBeVisible({ timeout: 8_000 })
    const row = window.locator('[data-testid="turn-source-row"][data-kind="knowledge"]')
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute("data-selected", "true")
    await expect(window.locator('[data-testid="renderer-crash-fallback"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("Element type is invalid")
    await expect(window.locator("body")).not.toContainText("Something went wrong!")
    await snap(window, "knowledge-source-drawer")
  } finally {
    await app.close()
  }
})

test("渲染崩溃回退面是中文短句，不摊英文堆栈", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-crash-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await window.evaluate(() => {
      window.__enjoyE2e?.crashRenderer()
    })
    const fallback = window.locator('[data-testid="renderer-crash-fallback"]')
    await expect(fallback).toBeVisible({ timeout: 8_000 })
    await expect(fallback).toContainText("这里出了点问题。")
    await expect(fallback).toContainText("重新加载")
    await expect(fallback).not.toContainText("Element type is invalid")
    await expect(fallback).not.toContainText("Something went wrong!")
    await expect(window.locator('[data-testid="renderer-crash-stack"]')).toHaveCount(0)
    await snap(window, "renderer-crash-fallback")
  } finally {
    await app.close()
  }
})
