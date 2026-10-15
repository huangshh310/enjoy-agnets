/**
 * 向导暂停（去改密钥 / 添加密钥）后马上恢复：遮罩不能压在内容上。
 * 根因见 setup-guide/dialog-open-generation.ts：Radix 遮罩先退完卸载、内容还在退场时恢复，
 * 旧内容节点被复用、新遮罩追加到 body 末尾 → 遮罩在上，「继续」点不到（key-invalid-status:170 偶发卡 30s）。
 * 真实路径：第 4 步点「添加 API 密钥」（向导暂停）→ 隔一小段时间按 Esc 关表单（向导恢复），扫一遍时机；
 * 去掉按打开次数换 key 的修复会红。
 * 需要先 build。
 */
import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, launchEnjoy, MAIN_ENTRY, openConnectModelStep } from "./base-p0-1-launch"

const RETURN_GUIDE = "返回入门向导"

async function overlayBelowContent(window: Page): Promise<{ overlays: number; contents: number; ok: boolean }> {
  return window.evaluate(() => {
    const kids = [...document.body.children]
    const overlays = kids.filter((el) => el.getAttribute("data-slot") === "dialog-overlay" && el.getAttribute("data-state") === "open")
    const contents = kids.filter((el) => el.getAttribute("data-slot") === "dialog-content" && el.getAttribute("data-state") === "open")
    const content = contents[contents.length - 1]
    const ok = Boolean(content) && overlays.every((overlay) => kids.indexOf(overlay) < kids.indexOf(content!))
    return { overlays: overlays.length, contents: contents.length, ok }
  })
}

test("向导关上后在退场动画里马上恢复：遮罩始终在内容下面，「继续」点得到", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  if (process.env.CI) expect(existsSync(MAIN_ENTRY), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(MAIN_ENTRY), "out/main/index.js missing; run desktop build first")
  const { app, window } = await launchEnjoy({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "none" })
  try {
    await openConnectModelStep(window)
    const primary = window.getByTestId("setup-guide-primary")
    const bad: string[] = []
    for (let delay = 0; delay <= 400; delay += 25) {
      // 点「添加 API 密钥」：向导 pauseAt 关上（退场动画开始）并跳到选厂商页；隔 delay 点页头「返回入门向导」
      // → resumeSetupGuide()，和存完 / 取消表单回向导同一条恢复路径。选厂商抽屉盖着页头，直接触发按钮自己的点击。
      await window.evaluate(
        async ({ ms, label }) => {
          document.querySelector<HTMLElement>('[data-testid="connect-model-api_key"]')?.click()
          const t0 = performance.now()
          let back: HTMLButtonElement | undefined
          while (!back && performance.now() - t0 < 8_000) {
            await new Promise((resolve) => requestAnimationFrame(resolve))
            back = [...document.querySelectorAll("button")].find((el) => el.textContent?.trim() === label)
          }
          const wait = ms - (performance.now() - t0)
          if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait))
          back?.click()
        },
        { ms: delay, label: RETURN_GUIDE }
      )
      await window.locator('[data-slot="dialog-content"][data-state="open"] [data-testid="setup-guide-connect-model"]').waitFor({ timeout: 8_000 })
      await window.waitForTimeout(500)
      const order = await overlayBelowContent(window)
      const clickable = await primary
        .click({ trial: true, timeout: 1_500 })
        .then(() => true)
        .catch(() => false)
      if (!order.ok || !clickable) {
        console.log("BODY", delay, JSON.stringify(await window.evaluate(() => [...document.body.children].map((k) => `${k.getAttribute("data-slot") ?? k.tagName}[${k.getAttribute("data-state") ?? ""}]`))))
        bad.push(`${delay}ms overlays=${order.overlays} contents=${order.contents} order=${order.ok} click=${clickable}`)
        break
      }
    }
    expect(bad, bad.join("\n")).toEqual([])
  } finally {
    await app.close()
  }
})
