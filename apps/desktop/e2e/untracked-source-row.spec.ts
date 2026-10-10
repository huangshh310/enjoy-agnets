/**
 * 未跟踪来源行第一次点击就要打开只读查看文件，不能落到可写 Monaco。
 */
import { execSync } from "node:child_process"
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { hideOverlays, launchEnjoy, snap } from "./base-p0-1-launch"
import { sendComposer } from "./send-composer"

test("第一次点未跟踪来源行打开只读查看文件", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(join(process.cwd(), "out/main/index.js")), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-untracked-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
  writeFileSync(join(workspace, "untracked.txt"), "hello knowledge\nline two\n")
  execSync("git init -b main", { cwd: workspace })
  execSync("git add readme.md", { cwd: workspace })
  execSync("git -c user.email=e2e@local -c user.name=e2e commit -m init", { cwd: workspace })
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace
  })
  try {
    await hideOverlays(window)
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "hello knowledge")
    const chip = window.locator(
      '[data-testid="turn-source-chip-knowledge"][data-source-path="untracked.txt"]'
    )
    await expect(chip).toBeVisible({ timeout: 20_000 })
    await chip.click()
    const sheet = window.locator('[data-testid="turn-sources-sheet"]')
    await expect(sheet).toBeVisible({ timeout: 8_000 })
    const row = window.locator('[data-testid="turn-source-row"][data-path="untracked.txt"]')
    await expect(row).toBeVisible()
    await row.click()
    await expect(sheet).toBeHidden({ timeout: 8_000 })
    const preview = window.locator('[data-testid="source-file-preview"]').first()
    await expect(preview).toBeVisible({ timeout: 8_000 })
    await expect(preview).toContainText("hello knowledge")
    await expect(preview).not.toContainText("@@")
    await expect(window.locator('[data-testid="source-file-diff"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="source-file-view-mode"]').first()).toContainText("查看文件")
    await expect(window.getByRole("button", { name: "保存" })).toHaveCount(0)
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getSelectedFile()?.view ?? ""), {
        timeout: 4_000
      })
      .toBe("preview")
    await snap(window, "untracked-source-row-preview")
  } finally {
    await app.close()
  }
})
