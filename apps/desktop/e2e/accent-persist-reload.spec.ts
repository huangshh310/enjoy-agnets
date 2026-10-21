/**
 * luna c166-reload-accent-mismatch：设置里选了琥珀，重启 / 刷新后设置页显示琥珀、界面却是蓝色，再点琥珀也没反应。
 * 根因：initThemeAccent() 从来没被调用（data-accent 和行内 --color-accent-500/600 只在点选时写）。
 * 现在 App.tsx 模块加载时和 initThemeSkin() 一起调用。
 * 断言：设置 → 外观 点「Claude 琥珀」→ html[data-accent=amber]、--color-accent-500 = #f59e0b → reload → 仍是琥珀；
 * 再手动把 data-accent 改掉，点一次当前已选的琥珀能重新套上。
 * 需要先 build；CI 的 e2e-window 跑，本机不起。
 */
import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, hideOverlays, launchEnjoy, MAIN_ENTRY, skipGuideIfOpen } from "./base-p0-1-launch"

const AMBER_LABEL = "Claude 琥珀"

async function appliedAccent(window: Page): Promise<{ accent: string | null; c500: string; c600: string }> {
  return window.evaluate(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    return {
      accent: root.getAttribute("data-accent"),
      c500: style.getPropertyValue("--color-accent-500").trim().toLowerCase(),
      c600: style.getPropertyValue("--color-accent-600").trim().toLowerCase()
    }
  })
}

async function openAppearance(window: Page): Promise<void> {
  await skipGuideIfOpen(window)
  await hideOverlays(window)
  await window.evaluate(() => {
    location.hash = "#/settings/appearance"
  })
  await window.getByRole("radiogroup", { name: "主题强调色" }).waitFor({ timeout: 15_000 })
}

const amberRadio = (window: Page) => window.getByRole("radiogroup", { name: "主题强调色" }).getByRole("radio", { name: AMBER_LABEL })

test("强调色：选琥珀 → 刷新后界面仍是琥珀；再点当前已选的琥珀会重新套用", async () => {
  test.setTimeout(150_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  if (process.env.CI) expect(existsSync(MAIN_ENTRY), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(MAIN_ENTRY), "out/main/index.js missing; run desktop build first")
  const { app, window } = await launchEnjoy({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "none" })
  try {
    await openAppearance(window)
    await amberRadio(window).click()
    await expect(amberRadio(window)).toHaveAttribute("aria-checked", "true")
    await expect.poll(() => appliedAccent(window)).toEqual({ accent: "amber", c500: "#f59e0b", c600: "#d97706" })

    await window.reload()
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, { timeout: 20_000 })
    // 刷新后不点任何东西，启动时就该是琥珀（修之前这里是 data-accent=null、500 = 蓝）
    await expect.poll(() => appliedAccent(window), { timeout: 10_000 }).toEqual({ accent: "amber", c500: "#f59e0b", c600: "#d97706" })
    await openAppearance(window)
    await expect(amberRadio(window)).toHaveAttribute("aria-checked", "true")

    // 界面和设置不一致时（比如被别处改掉），点当前已选的那个要能重新套用
    await window.evaluate(() => {
      document.documentElement.removeAttribute("data-accent")
      document.documentElement.style.removeProperty("--color-accent-500")
    })
    await amberRadio(window).click()
    await expect.poll(() => appliedAccent(window)).toEqual({ accent: "amber", c500: "#f59e0b", c600: "#d97706" })
  } finally {
    await app.close()
  }
})
