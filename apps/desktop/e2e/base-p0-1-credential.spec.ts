/**
 * 凭证三态（mike 的 key-status）与首发夹具。走 ENJOY_E2E_CREDENTIAL / ENJOY_E2E_SEND，不走 setError 桥。
 * 徽标只有三态：ok 绿 / unverified 灰 / invalid 红；forbidden / billing 仍灰，只在提示条文案与按钮上区分。
 * 列表断言收窄到 providers-configured-list，避免侧栏同名。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import {
  canLaunchElectron,
  hideOverlays,
  launchEnjoy,
  openAddKeyForm,
  openConnectModelStep,
  skipGuideIfOpen,
  snap,
  snapThemes
} from "./base-p0-1-launch"

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
  const list = window.getByTestId("providers-configured-list")
  await list.waitFor({ timeout: 12_000 })
  await list.getByText("E2E Stub Key", { exact: true }).waitFor({ timeout: 8_000 })
}

function listStatus(window: Page) {
  return window.getByTestId("providers-configured-list").getByTestId("provider-key-status")
}

function listHint(window: Page) {
  return window.getByTestId("providers-configured-list").getByTestId("provider-key-hint")
}

/** mike 的真实路径：none 起步，引导里存一把 DeepSeek 密钥，校验夹具写到这份档案上。返回 userData 供换语言重启。 */
async function launchWithSavedKey(credential: string, lang: "zh" | "en" = "zh") {
  const userData = mkdtempSync(join(tmpdir(), "enjoy-p01-cred-ud-"))
  const base = { ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "none", ENJOY_E2E_CREDENTIAL: credential, ENJOY_E2E_USERDATA: userData }
  const first = await launchEnjoy(base)
  await openConnectModelStep(first.window)
  await openAddKeyForm(first.window)
  const form = first.window.getByRole("dialog", { name: "添加 DeepSeek" })
  await form.getByTestId("provider-simple-fields").locator('input[type="password"]').first().fill("sk-e2e-key")
  await form.getByTestId("provider-editor-save").click()
  await expect(first.window.getByTestId("connect-model-api_key")).toHaveAttribute("data-key-status", /.+/, {
    timeout: 15_000
  })
  if (lang === "zh") return first
  await first.app.close()
  return launchEnjoy({ ...base, ENJOY_E2E_LANG: lang })
}

async function openProviderList(window: Page): Promise<void> {
  const status = window.getByTestId("providers-configured-list").getByTestId("provider-key-status")
  // 向导存完密钥还在收尾时改 hash 偶尔被吞：重设直到列表出来。
  await expect(async () => {
    await window.evaluate(() => {
      window.__enjoyE2e?.hideCreateProject()
      location.hash = "#/settings/providers"
    })
    await status.waitFor({ timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
  // 首启闸可能把向导从介绍页再打开（中 / 英），点跳过收掉，截图只留设置页。
  const skip = window.getByRole("button", { name: /^(跳过设置|Skip setup)$/ })
  await skip.waitFor({ timeout: 3_000 }).catch(() => undefined)
  if (await skip.count()) await skip.click()
  await expect(skip).toHaveCount(0, { timeout: 8_000 })
  await hideOverlays(window)
  await window.waitForTimeout(400)
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
    await expect(notice).toContainText("E2E Stub Key")
    await expect(notice).toContainText(/不认这把密钥/)
    await expect(notice).toContainText("草稿会留着")
    await expect(notice).not.toContainText(/401|403|ECONNREFUSED|invalid api key/i)
    await expect(notice.getByTestId("thread-credential-invalid-notice-action")).toHaveText("改密钥")
    await expect(window.getByTestId("composer-input")).toHaveValue("hello invalid key")
    await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
    await snapThemes(window, "p0-1-credential-invalid-notice")
    await snap(window, "p0-1-credential-invalid-notice-disable-gpu")
    await notice.getByTestId("thread-credential-invalid-notice-action").click()
    await window.waitForFunction(
      () => location.hash.includes("settings/providers") && location.hash.includes("edit="),
      undefined,
      { timeout: 8_000 }
    )
    const keyBox = window.getByTestId("provider-key-input")
    await expect(keyBox).toBeVisible({ timeout: 12_000 })
    const status = listStatus(window)
    await expect(status).toHaveAttribute("data-key-status", "invalid", { timeout: 8_000 })
    await expect(status).toContainText("密钥被 OpenAI 拒绝了")
    await expect(window.getByTestId("providers-configured-list").getByTestId("provider-fix-key")).toHaveText("改密钥")
    await snapThemes(window, "p0-1-credential-invalid-edit")
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
    await expect(notice).toContainText("E2E Stub Key")
    await expect(notice).toContainText(/连不上 .+，消息没发出去/)
    await expect(notice).toContainText("草稿会留着，检查网络后再试")
    await expect(notice).not.toContainText(/ECONNREFUSED|ECONNRESET|ETIMEDOUT|status|401|403/i)
    const action = notice.getByTestId("thread-credential-network-notice-action")
    await expect(action).toHaveText("再发一次")
    await expect(window.getByTestId("composer-input")).toHaveValue("hello unreachable")
    await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
    await snapThemes(window, "p0-1-credential-network-notice")
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
    await snapThemes(window, "p0-1-credential-network-resend")
    await openProviders(window)
    const status = listStatus(window)
    // 连不上不改档案校验：不会被打成红「被拒」。
    await expect(status).not.toHaveAttribute("data-key-status", "invalid")
    await expect(status).not.toContainText("拒绝了")
  } finally {
    await app.close()
  }
})

for (const code of ["network", "timeout", "unknown"] as const) {
  test(`还没法确认 ${code}：灰标，不出余额 / 权限提示`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchWithSavedKey(`unverified:${code}`)
    try {
      await openProviderList(window)
      const status = listStatus(window)
      await expect(status).toHaveAttribute("data-key-status", "unverified", { timeout: 15_000 })
      await expect(status).toHaveAttribute("data-tone", "neutral")
      await expect(status).toContainText("密钥已保存，暂时没法确认能否用")
      await expect(listHint(window)).toHaveCount(0)
    } finally {
      await app.close()
    }
  })
}

test("夹具 invalid / ok：列表红「被拒」+ 改密钥，绿「已验证」", async () => {
  test.setTimeout(240_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const invalid = await launchWithSavedKey("invalid")
  try {
    await openProviderList(invalid.window)
    const status = listStatus(invalid.window)
    await expect(status).toHaveAttribute("data-key-status", "invalid", { timeout: 15_000 })
    await expect(status).toHaveAttribute("data-tone", "error")
    await expect(status).toContainText("密钥被 DeepSeek 拒绝了")
    await expect(invalid.window.getByTestId("providers-configured-list").getByTestId("provider-fix-key")).toHaveText("改密钥")
    await expect(listHint(invalid.window)).toHaveCount(0)
  } finally {
    await invalid.app.close()
  }
  const ok = await launchWithSavedKey("ok")
  try {
    await openProviderList(ok.window)
    const status = listStatus(ok.window)
    await expect(status).toHaveAttribute("data-key-status", "ok", { timeout: 15_000 })
    await expect(status).toContainText("密钥已验证")
    await expect(listHint(ok.window)).toHaveCount(0)
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
    await openProviders(window)
    const status = listStatus(window)
    await expect(status).toHaveAttribute("data-key-status", "ok", { timeout: 12_000 })
    await expect(status).toContainText("密钥已验证")
    await snapThemes(window, "p0-1-credential-send-stores-ok")
  } finally {
    await app.close()
  }
})

const COPY = {
  zh: {
    forbidden: "这把密钥没有权限用这个模型，换一把或换个模型。",
    billing: "DeepSeek 账户余额不足，充值后再试。",
    fix: "改密钥",
    topUp: "去充值",
    unverified: "密钥已保存，暂时没法确认能否用"
  },
  en: {
    forbidden: "This key doesn't have access to this model. Use another key or pick another model.",
    billing: "Your DeepSeek account is out of credit. Top up and try again.",
    fix: "Change key",
    topUp: "Top up",
    unverified: null
  }
} as const

const RESTRICTED = {
  forbidden: {
    kind: "provider_forbidden",
    notice: "{name} 拒绝了这次请求，消息没发出去。草稿会留着，可以换个模型，或稍后再试。"
  },
  billing: {
    kind: "provider_billing",
    notice: "{name} 说额度或账单有问题，消息没发出去。草稿会留着，可以先换个模型，处理好后再试。"
  }
} as const

for (const code of ["forbidden", "billing"] as const) {
  for (const lang of ["zh", "en"] as const) {
    test(`列表 ${code}（${lang}）：徽标仍灰，提示条按原始码出文案与按钮`, async () => {
      test.setTimeout(180_000)
      const blocked = canLaunchElectron()
      test.skip(Boolean(blocked), blocked ?? "")
      test.setTimeout(240_000)
      const { app, window } = await launchWithSavedKey(`unverified:${code}`, lang)
      const copy = COPY[lang]
      try {
        await openProviderList(window)
        const status = listStatus(window)
        await expect(status).toHaveAttribute("data-key-status", "unverified", { timeout: 15_000 })
        await expect(status).toHaveAttribute("data-tone", "neutral")
        if (copy.unverified) await expect(status).toContainText(copy.unverified)
        const hint = listHint(window)
        await expect(hint).toHaveAttribute("data-hint-kind", code)
        await expect(hint).toContainText(copy[code])
        await expect(hint).not.toContainText(/401|402|403|Forbidden|Payment Required/i)
        const action = hint.getByTestId("provider-key-hint-action")
        await expect(action).toHaveText(code === "forbidden" ? copy.fix : copy.topUp)
        await snap(window, `p0-1-key-hint-${code}-${lang}`)
        if (code === "forbidden") {
          await action.click()
          await expect(window.getByTestId("provider-key-input")).toBeVisible({ timeout: 12_000 })
        } else {
          // 走现有 window.openExternal 安全通道：主进程 shell.openExternal 被替换成记录器，不真开浏览器。
          await app.evaluate(({ shell }) => {
            const g = globalThis as unknown as { __opened?: string[] }
            g.__opened = []
            shell.openExternal = async (url: string) => {
              g.__opened!.push(url)
            }
          })
          await action.click()
          await expect
            .poll(() => app.evaluate(() => (globalThis as unknown as { __opened?: string[] }).__opened ?? []))
            .toEqual(["https://platform.deepseek.com/top_up"])
        }
      } finally {
        await app.close()
      }
    })
  }

  test(`向导连模型步 ${code}：徽标灰 + 同一提示条`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchEnjoy({
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_CREDENTIAL: `unverified:${code}`
    })
    try {
      await openConnectModelStep(window)
      await expect(window.getByTestId("connect-model-key-badge")).toHaveAttribute("data-tone", "neutral")
      const hint = window.getByTestId("connect-model-key-hint")
      await expect(hint).toHaveAttribute("data-hint-kind", code)
      // 向导走 chat-ready 夹具里的 OpenAI 档案。
      await expect(hint).toContainText(code === "billing" ? "OpenAI 账户余额不足，充值后再试。" : COPY.zh.forbidden)
      await expect(hint.getByTestId("connect-model-key-hint-action")).toHaveText(
        code === "forbidden" ? COPY.zh.fix : COPY.zh.topUp
      )
      await snap(window, `p0-1-guide-key-hint-${code}-zh`)
    } finally {
      await app.close()
    }
  })

  test(`发送 ${code}：琥珀白卡 + 换个模型 / 再试一次，草稿留下`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const fixture = RESTRICTED[code]
    const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: code }))
    try {
      await openChat(window)
      await sendDraft(window, `hello ${code}`)
      const notice = window.getByTestId("thread-credential-restricted-notice")
      await expect(notice).toBeVisible({ timeout: 12_000 })
      await expect(notice).toHaveAttribute("data-kind", fixture.kind)
      await expect(notice).toHaveAttribute("data-tone", "warning")
      await expect(notice).toContainText(fixture.notice.replace("{name}", "E2E Stub Key"))
      await expect(notice).not.toContainText(/401|402|403|Forbidden|Payment Required|ECONNREFUSED/i)
      await expect(notice.getByTestId("thread-credential-restricted-notice-action")).toHaveText("换个模型")
      await expect(notice.getByTestId("thread-credential-restricted-notice-retry")).toHaveText("再试一次")
      await expect(window.getByTestId("composer-input")).toHaveValue(`hello ${code}`)
      await expect(window.getByTestId("thread-no-chat-route-notice")).toHaveCount(0)
      await expect(window.getByTestId("thread-credential-invalid-notice")).toHaveCount(0)
      await snapThemes(window, `p0-1-credential-${code}-notice`)
      await notice.getByTestId("thread-credential-restricted-notice-action").click()
      await expect(window.getByTestId("composer-engine-chip")).toHaveAttribute("data-state", "open", {
        timeout: 8_000
      })
    } finally {
      await app.close()
    }
  })
}
