/**
 * 出字前回滚依赖 #135 main：落库用户句 + 空助手回滚、run.error.preOutput、
 * session.setFocused 合成后台 Inbox「失败」。renderer 行为由单测覆盖。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import {
  canLaunchElectron,
  hideOverlays,
  launchEnjoy,
  skipGuideIfOpen
} from "./base-p0-1-launch"

const PENDING_KAI = "pending-kai: #135 尚未落地 run 回滚 / preOutput / setFocused 合成"

function keyEnv(extra: Record<string, string> = {}): Record<string, string> {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-pre-"))
  return {
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ...extra
  }
}

test("pending-kai：出字前失败切走再切回没有用户气泡", async () => {
  test.skip(true, PENDING_KAI)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "unreachable" }))
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    const composer = window.getByTestId("composer-input")
    await composer.waitFor({ timeout: 20_000 })
    await composer.fill("hello rollback")
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(composer).toHaveValue("hello rollback")
    await expect(window.getByText("hello rollback", { exact: true })).toHaveCount(1)
    await window.evaluate(() => {
      const row = document.querySelector<HTMLButtonElement>("[data-testid='sidebar-new-session']")
      row?.click()
    })
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await expect(composer).toBeVisible()
    await expect(window.getByText("hello rollback", { exact: true })).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test("pending-kai：前台出字前失败不进 Inbox 失败列", async () => {
  test.skip(true, PENDING_KAI)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "rejected" }))
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    const composer = window.getByTestId("composer-input")
    await composer.waitFor({ timeout: 20_000 })
    await composer.fill("hello inbox")
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-invalid-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(window.getByTestId("attention-strip")).toHaveCount(0)
    await window.evaluate(() => {
      location.hash = "#/inbox"
    })
    await expect(window.getByTestId("inbox-nav-failed")).toBeVisible({ timeout: 8_000 })
    await window.getByTestId("inbox-nav-failed").click()
    await expect(window.getByText("hello inbox")).toHaveCount(0)
  } finally {
    await app.close()
  }
})
