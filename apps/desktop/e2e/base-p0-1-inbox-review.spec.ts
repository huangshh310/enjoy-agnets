/**
 * Inbox P2：空态中文、待验收次行由单测钉死。本文件验空态不含 Inbox 英文。
 */
import { expect, test } from "@playwright/test"
import { canLaunchElectron, hideOverlays, launchEnjoy, skipGuideIfOpen, snap } from "./base-p0-1-launch"

test("Inbox 空态不写英文 Inbox", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    await window.evaluate(() => {
      location.hash = "#/inbox"
    })
    await expect(window.getByText("还没有要处理的消息")).toBeVisible({ timeout: 15_000 })
    const hint = window.getByText(/完成不进默认/)
    await expect(hint).toBeVisible()
    await expect(hint).toContainText("收件箱")
    await expect(hint).not.toContainText("Inbox")
    await snap(window, "p0-1-inbox-empty-zh")
  } finally {
    await app.close()
  }
})
