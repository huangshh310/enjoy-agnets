/**
 * 等 Enjoy Local 把 modelId 写进 store（aria-label=Send）再点发送。
 * hasKey 会先于 models.list 亮灯；抢点会打出 Choose a model，窗口里看不到 stub-ok。
 */
import type { Locator, Page } from "@playwright/test"

export async function sendComposer(window: Page, composer: Locator, text: string) {
  await composer.fill(text)
  const send = window.locator('[data-testid="composer-send"]')
  await send.waitFor({ timeout: 15_000 })
  await window.waitForFunction(
    () => {
      const label = document.querySelector('[data-testid="composer-send"]')?.getAttribute("aria-label") ?? ""
      return label === "Send" || label === "发送"
    },
    undefined,
    { timeout: 15_000 }
  )
  await send.click()
}
