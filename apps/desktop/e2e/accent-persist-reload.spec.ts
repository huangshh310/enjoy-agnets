/**
 * luna c166-reload-accent-mismatch：设置里选了琥珀，重启 / 刷新后设置页显示琥珀、界面却是蓝色，再点琥珀也没反应。
 * 根因：initThemeAccent() 从来没被调用（data-accent 和行内 --color-accent-500/600 只在点选时写）。
 * 现在 App.tsx 模块加载时和 initThemeSkin() 一起调用。
 * 断言：设置 → 外观 点琥珀（[data-accent-option=amber]）→ html[data-accent=amber]、--color-accent-500 = #f59e0b、
 * --color-cta 解析成 #f59e0b、--color-cta-foreground #1a1612 → reload → 仍是琥珀；切暗色仍是琥珀；
 * 再手动把 data-accent 改掉，点一次当前已选的琥珀能重新套上。
 * 需要先 build；CI 的 e2e-window 跑，本机不起。
 */
import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, forceTheme, hideOverlays, launchEnjoy, MAIN_ENTRY, skipGuideIfOpen } from "./base-p0-1-launch"

type Applied = { accent: string | null; c500: string; c600: string; cta: string; ctaFg: string }

/** 琥珀：行内 500 / 600 是 v3 hex，主按钮 cta 固定 500 底墨色字（theme.css :root[data-accent="amber"]）。亮暗相同。 */
const AMBER: Applied = { accent: "amber", c500: "#f59e0b", c600: "#d97706", cta: "#f59e0b", ctaFg: "#1a1612" }

async function appliedAccent(window: Page): Promise<Applied> {
  return window.evaluate(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    const v = (name: string) => style.getPropertyValue(name).trim().toLowerCase()
    // 自定义属性的计算值会把 var() 代换掉；保险起见再用一个探针元素把 --color-cta 解析成 rgb → hex
    const probe = document.createElement("span")
    probe.style.color = "var(--color-cta)"
    document.body.appendChild(probe)
    const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? []
    probe.remove()
    const cta = rgb.length === 3 ? `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}` : v("--color-cta")
    const fg = document.createElement("span")
    fg.style.color = "var(--color-cta-foreground)"
    document.body.appendChild(fg)
    const fgRgb = getComputedStyle(fg).color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? []
    fg.remove()
    const ctaFg = fgRgb.length === 3 ? `#${fgRgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}` : v("--color-cta-foreground")
    return { accent: root.getAttribute("data-accent"), c500: v("--color-accent-500"), c600: v("--color-accent-600"), cta, ctaFg }
  })
}

async function openAppearance(window: Page): Promise<void> {
  await skipGuideIfOpen(window)
  await hideOverlays(window)
  await window.evaluate(() => {
    location.hash = "#/settings/appearance"
  })
  await window.locator('[role="radio"][data-accent-option]').first().waitFor({ timeout: 15_000 })
}

// 用 data-accent-option，不依赖界面语言
const amberRadio = (window: Page) => window.locator('[role="radio"][data-accent-option="amber"]')

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
    await expect.poll(() => appliedAccent(window)).toEqual(AMBER)

    await window.reload()
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, { timeout: 20_000 })
    // 刷新后不点任何东西，启动时就该是琥珀（修之前这里是 data-accent=null、500 = 蓝）
    await expect.poll(() => appliedAccent(window), { timeout: 10_000 }).toEqual(AMBER)
    await openAppearance(window)
    await expect(amberRadio(window)).toHaveAttribute("aria-checked", "true")

    // 暗色：同一套琥珀（data-accent 不丢、cta 仍是 500 墨色字）
    await forceTheme(window, "dark")
    await expect.poll(() => appliedAccent(window)).toEqual(AMBER)
    await forceTheme(window, "light")

    // 界面和设置不一致时（比如被别处改掉），点当前已选的那个要能重新套用
    await window.evaluate(() => {
      document.documentElement.removeAttribute("data-accent")
      document.documentElement.style.removeProperty("--color-accent-500")
    })
    await amberRadio(window).click()
    await expect.poll(() => appliedAccent(window)).toEqual(AMBER)
  } finally {
    await app.close()
  }
})
