/**
 * luna（main c849e3f4 巡检 P1）：出字前失败（连不上）丢图，三种情况真机：
 * ① 只图发送 → 图回输入框，白卡「图片已放回输入框」，点「再发一次」真把图发出去；
 * ② 有字有图 → 字和图都回来，白卡「文字和图片已放回输入框」；
 * ③ ② 之后重启 → 草稿里字和图都在，再发时模型（stub）真收到图（attached:<名>）。
 * stub 按能看图处理（ENJOY_E2E_STUB_VISION），真 PNG 才走得到出字前失败。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/pre-output-rollback-images")
// 160x100 蓝色 PNG（截图里看得见）
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

async function boot(env: Record<string, string>) {
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_STUB_VISION: "1",
    ...env
  })
  const window = await firstWindow(app)
  const skip = window.getByRole("button", { name: /^(跳过设置|Skip setup)$/ })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

function dirs() {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-img-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return { ENJOY_E2E_WORKSPACE: workspace, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-img-ud-")) }
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})

test("① 只图发送出字前失败：图回输入框，白卡「图片已放回输入框」，再发一次真发出图", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_ONCE: "1" })
  try {
    const composer = window.getByTestId("composer-input")
    const chip = window.getByTestId("composer-asset-chip")
    await window.getByTestId("composer-attach").setInputFiles({ name: "only.png", mimeType: "image/png", buffer: PNG })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await composer.click()
    await window.keyboard.press("Enter")
    const notice = window.getByTestId("thread-credential-network-notice")
    await expect(notice).toBeVisible({ timeout: 15_000 })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await expect(composer).toHaveValue("")
    await expect(window.getByTestId("thread-credential-network-notice-detail")).toHaveText("图片已放回输入框，可以直接再发。")
    await window.screenshot({ path: join(shots, "11-image-only-restored.png") })
    await window.getByTestId("thread-credential-network-notice-action").click()
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage).toContainText("attached:only.png", { timeout: 20_000 })
    await expect(chip).toHaveCount(0)
    await window.screenshot({ path: join(shots, "12-image-only-resent.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("②③ 有字有图出字前失败：字和图都回来；重启后草稿仍在，再发时图真随消息走", async () => {
  test.setTimeout(240_000)
  const base = dirs()
  let { app, window } = await boot({ ...base, ENJOY_E2E_SEND: "unreachable" })
  try {
    const chip = window.getByTestId("composer-asset-chip")
    await window.getByTestId("composer-attach").setInputFiles({ name: "both.png", mimeType: "image/png", buffer: PNG })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    const composer = window.getByTestId("composer-input")
    await composer.fill("看看这张图")
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 15_000 })
    await expect(composer).toHaveValue("看看这张图")
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await expect(window.getByTestId("thread-credential-network-notice-detail")).toHaveText(
      "文字和图片已放回输入框，可以直接再发。"
    )
    await window.screenshot({ path: join(shots, "21-text-image-restored.png") })
    await closeForRelaunch(app)
    // ③ 重启（网络恢复）：草稿里字和图都在，再发时模型收到图。
    ;({ app, window } = await boot(base))
    const row = window.getByTestId("sidebar-session-row").first()
    if ((await row.count()) > 0) await row.locator("button").first().click()
    await expect(window.getByTestId("composer-input")).toHaveValue("看看这张图", { timeout: 12_000 })
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 12_000 })
    await window.screenshot({ path: join(shots, "31-after-restart-draft.png") })
    await window.getByTestId("composer-input").press("Enter")
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage).toContainText("attached:both.png", { timeout: 20_000 })
    await expect(stage.locator('[data-thread-message] img[alt="both.png"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(0)
    await window.screenshot({ path: join(shots, "32-after-restart-resent-with-image.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

const LOCKED = {
  zh: {
    restoredBoth: "文字和图片已放回输入框，可以直接再发。",
    draftStays: "草稿会留着"
  },
  en: {
    restoredBoth: "Your text and image are back in the input. You can send them again.",
    draftStays: "draft stays"
  }
} as const

for (const lang of ["zh", "en"] as const) {
  test(`luna 锁定文案（${lang}）：发出后失败还稿带「…已放回」；接着被闸拦（输入框没清空）只给原因 + 按钮`, async () => {
    test.setTimeout(180_000)
    const copy = LOCKED[lang]
    const { app, window } = await boot({
      ...dirs(),
      ENJOY_E2E_LANG: lang,
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_SEND: "rejected"
    })
    try {
      const composer = window.getByTestId("composer-input")
      const chip = window.getByTestId("composer-asset-chip")
      const notice = window.getByTestId("thread-credential-invalid-notice")
      const detail = window.getByTestId("thread-credential-invalid-notice-detail")
      await window.getByTestId("composer-attach").setInputFiles({ name: "gate.png", mimeType: "image/png", buffer: PNG })
      await expect(chip).toHaveCount(1, { timeout: 8_000 })
      await composer.fill(lang === "zh" ? "看看这张图" : "check this image")
      await composer.press("Enter")
      // ① 发出去后失败（输入框清空过又还回）：一张图 + 字 → 「文字和图片已放回」（英文单数）。
      await expect(notice).toBeVisible({ timeout: 15_000 })
      await expect(detail).toHaveText(copy.restoredBoth)
      await expect(notice).not.toContainText(new RegExp(copy.draftStays, "i"))
      await expect(chip).toHaveCount(1)
      await window.screenshot({ path: join(shots, `r4-copy-${lang}-1-restored-after-send.png`) })
      // ② 密钥已判无效：再回车被闸拦，输入框从没清空——只有原因 + 按钮，没有「已放回」行。
      await composer.press("Enter")
      await window.waitForTimeout(1_500)
      await expect(notice).toBeVisible()
      await expect(detail).toHaveCount(0)
      await expect(notice).not.toContainText(new RegExp(copy.draftStays, "i"))
      await expect(composer).toHaveValue(lang === "zh" ? "看看这张图" : "check this image")
      await expect(chip).toHaveCount(1)
      await window.screenshot({ path: join(shots, `r4-copy-${lang}-2-gate-rejected.png`) })
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("luna 锁定文案（en）：只一张图出字前失败 → 单数「Your image is back in the input」", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_LANG: "en", ENJOY_E2E_SEND: "unreachable" })
  try {
    await window.getByTestId("composer-attach").setInputFiles({ name: "one.png", mimeType: "image/png", buffer: PNG })
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 8_000 })
    await window.getByTestId("composer-input").click()
    await window.keyboard.press("Enter")
    const notice = window.getByTestId("thread-credential-network-notice")
    await expect(notice).toBeVisible({ timeout: 15_000 })
    await expect(window.getByTestId("thread-credential-network-notice-detail")).toHaveText(
      "Your image is back in the input. You can send it again."
    )
    await expect(notice).not.toContainText(/draft stays/i)
    await window.screenshot({ path: join(shots, "r4-copy-en-3-unreachable-one-image.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
