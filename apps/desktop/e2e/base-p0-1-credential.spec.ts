/**
 * 凭证三态与首发夹具。走 ENJOY_E2E_CREDENTIAL / ENJOY_E2E_SEND，不走 setError 桥。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import {
  canLaunchElectron,
  clickGuidePrimary,
  hideOverlays,
  launchEnjoy,
  skipGuideIfOpen,
  snap
} from "./base-p0-1-launch"

const UNVERIFIED_HINT = "密钥还没验证，第一次发消息时会检查。"
const HINTS = {
  network: "连不上服务，检查网络后再试。",
  timeout: "服务半天没回应，稍后再试。",
  unknown: "暂时没法验证，可以先用，发消息时会再检查。"
} as const

function keyEnv(extra: Record<string, string> = {}): Record<string, string> {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-cred-"))
  return {
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ...extra
  }
}

async function openChat(window: Page): Promise<void> {
  await skipGuideIfOpen(window)
  await hideOverlays(window)
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
}

async function openProviders(window: Page): Promise<void> {
  await hideOverlays(window)
  await window.evaluate(() => {
    location.hash = "#/settings/providers"
  })
  await window.getByTestId("credential-check-status").waitFor({ timeout: 12_000 })
}

async function sendDraft(window: Page, text: string): Promise<void> {
  const composer = window.getByTestId("composer-input")
  await composer.fill(text)
  await composer.press("Enter")
}

test("密钥被拒：红点条 + 改密钥打开本档案密钥框，草稿留下", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "rejected" }))
  try {
    await openChat(window)
    await sendDraft(window, "hello invalid key")
    const notice = window.getByTestId("thread-credential-invalid-notice")
    await expect(notice).toBeVisible({ timeout: 12_000 })
    await expect(notice).toHaveAttribute("data-kind", "credential_invalid")
    await expect(notice).toContainText("密钥没通过")
    await expect(notice).toContainText("E2E Stub Key 不认这把密钥")
    await expect(notice).toContainText("草稿会留着")
    await expect(notice).not.toContainText(/401|403|ECONNREFUSED|invalid api key/i)
    await expect(notice.getByTestId("thread-credential-invalid-notice-action")).toHaveText("改密钥")
    await expect(window.getByTestId("composer-input")).toHaveValue("hello invalid key")
    await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
    await snap(window, "p0-1-credential-invalid-notice")
    await notice.getByTestId("thread-credential-invalid-notice-action").click()
    await window.waitForFunction(
      () => location.hash.includes("settings/providers") && location.hash.includes("edit=") && location.hash.includes("focus=key"),
      undefined,
      { timeout: 8_000 }
    )
    const keyBox = window.getByTestId("provider-key-input")
    await expect(keyBox).toBeVisible({ timeout: 8_000 })
    await expect(keyBox).toBeFocused()
    const status = window.getByTestId("credential-check-status")
    await expect(status).toHaveAttribute("data-state", "invalid", { timeout: 8_000 })
    await expect(status).toContainText("密钥无效")
    await expect(window.getByTestId("credential-fix-key")).toHaveText("改密钥")
    await snap(window, "p0-1-credential-invalid-edit")
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await expect(window.getByTestId("composer-input")).toHaveValue("hello invalid key")
  } finally {
    await app.close()
  }
})

test("连不上：中性点 + 再发一次，发送中改正在发送，态不变", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "unreachable" }))
  try {
    await openChat(window)
    await sendDraft(window, "hello unreachable")
    const notice = window.getByTestId("thread-credential-network-notice")
    await expect(notice).toBeVisible({ timeout: 12_000 })
    await expect(notice).toHaveAttribute("data-kind", "provider_unreachable")
    await expect(notice).toContainText("连不上 E2E Stub Key")
    await expect(notice).toContainText("草稿会留着，检查网络后再试")
    await expect(notice).not.toContainText(/ECONNREFUSED|ECONNRESET|ETIMEDOUT|status|401|403/i)
    const action = notice.getByTestId("thread-credential-network-notice-action")
    await expect(action).toHaveText("再发一次")
    await expect(window.getByTestId("composer-input")).toHaveValue("hello unreachable")
    await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
    await snap(window, "p0-1-credential-network-notice")
    const sending = await window.evaluate(async () => {
      const btn = document.querySelector<HTMLButtonElement>("[data-testid='thread-credential-network-notice-action']")
      if (!btn) return false
      const seen: string[] = []
      const obs = new MutationObserver(() => seen.push(btn.textContent ?? ""))
      obs.observe(btn, { childList: true, subtree: true, characterData: true })
      btn.click()
      await new Promise((resolve) => window.setTimeout(resolve, 80))
      obs.disconnect()
      return seen.some((text) => text.includes("正在发送")) || btn.disabled
    })
    expect(sending).toBe(true)
    await expect(window.getByTestId("thread-credential-network-notice")).toHaveCount(1)
    await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
    await snap(window, "p0-1-credential-network-resend")
    await openProviders(window)
    const status = window.getByTestId("credential-check-status")
    await expect(status).toHaveAttribute("data-state", "ok")
    await expect(status).toContainText("已连上")
    await expect(status).not.toContainText("密钥无效")
  } finally {
    await app.close()
  }
})

for (const code of ["network", "timeout", "unknown"] as const) {
  test(`还没验证 ${code}：灰标 + 再试一次 + 次行`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_CREDENTIAL: `unverified:${code}` }))
    try {
      await openChat(window)
      await openProviders(window)
      const status = window.getByTestId("credential-check-status")
      await expect(status).toHaveAttribute("data-state", "unverified")
      await expect(status).toContainText("已保存 · 还没验证")
      await expect(window.getByTestId("credential-recheck")).toHaveText("再试一次")
      await expect(status).toContainText(HINTS[code])
      await snap(window, `p0-1-credential-unverified-${code}`)
    } finally {
      await app.close()
    }
  })
}

test("夹具 invalid / ok：列表红无效与绿已连上", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const invalid = await launchEnjoy(keyEnv({ ENJOY_E2E_CREDENTIAL: "invalid" }))
  try {
    await openChat(invalid.window)
    await openProviders(invalid.window)
    const status = invalid.window.getByTestId("credential-check-status")
    await expect(status).toHaveAttribute("data-state", "invalid")
    await expect(status).toContainText("密钥无效")
    await expect(invalid.window.getByTestId("credential-fix-key")).toHaveText("改密钥")
    await snap(invalid.window, "p0-1-credential-invalid-row")
  } finally {
    await invalid.app.close()
  }
  const ok = await launchEnjoy(keyEnv({ ENJOY_E2E_CREDENTIAL: "ok" }))
  try {
    await openChat(ok.window)
    await openProviders(ok.window)
    const status = ok.window.getByTestId("credential-check-status")
    await expect(status).toHaveAttribute("data-state", "ok")
    await expect(status).toContainText("已连上")
    await snap(ok.window, "p0-1-credential-ok-row")
  } finally {
    await ok.app.close()
  }
})

test("正常发送把 unverified 写成 ok", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_CREDENTIAL: "unverified" }))
  try {
    await openChat(window)
    await sendDraft(window, "hello verify ok")
    await expect(window.getByText(/stub-ok/)).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => {
      return window.evaluate(() => window.__enjoyE2e?.getChatReadiness()?.credentialCheck?.state)
    }).toBe("ok")
    await openProviders(window)
    const status = window.getByTestId("credential-check-status")
    await expect(status).toHaveAttribute("data-state", "ok")
    await expect(status).toContainText("已连上")
    await snap(window, "p0-1-credential-send-stores-ok")
  } finally {
    await app.close()
  }
})

test("末屏 ready + unverified 只挂副标题", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_CREDENTIAL: "unverified"
  })
  try {
    await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 20_000 })
    for (let i = 0; i < 8; i += 1) {
      if (await window.getByTestId("ready-unverified-hint").count()) break
      const primary = window.getByTestId("setup-guide-primary")
      if (await primary.count()) await clickGuidePrimary(window)
    }
    await expect(window.getByRole("heading", { name: "可以开始了" })).toBeVisible()
    await expect(window.getByTestId("ready-unverified-hint")).toHaveText(UNVERIFIED_HINT)
    await expect(window.getByRole("heading", { name: "还差一步：连一个模型" })).toHaveCount(0)
    await snap(window, "p0-1-ready-unverified-hint")
  } finally {
    await app.close()
  }
})
