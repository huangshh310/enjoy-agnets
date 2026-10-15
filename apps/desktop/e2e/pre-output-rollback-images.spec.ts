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

test("jojo P2：失败后又打了新字、贴了新图 → 「再发一次」只重发那一句 + 它的图；新字新图留在输入框", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_ONCE: "1" })
  try {
    const composer = window.getByTestId("composer-input")
    const chip = window.getByTestId("composer-asset-chip")
    await window.getByTestId("composer-attach").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await composer.fill("看看这张图")
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 15_000 })
    await expect(composer).toHaveValue("看看这张图")
    // 用户接着写下一条：新字 + 新图（与还回来的那一句同框）。
    await composer.fill("看看这张图\n下一条：再看看这张")
    await window.getByTestId("composer-attach").setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PNG })
    await expect(chip).toHaveCount(2, { timeout: 8_000 })
    await window.screenshot({ path: join(shots, "r4-jojo-retry-1-before.png") })
    await window.getByTestId("thread-credential-network-notice-action").click()
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage).toContainText("attached:a.png", { timeout: 20_000 })
    await expect(stage.locator('[data-thread-message] img[alt="a.png"]')).toHaveCount(1, { timeout: 20_000 })
    // 恰好一条：新图没跟着发，也没另发一条。
    await window.waitForTimeout(1_500)
    await expect(stage).not.toContainText("attached:b.png")
    await expect(stage.locator('[data-thread-message] img[alt="b.png"]')).toHaveCount(0)
    await expect(stage.locator("[data-thread-message]").filter({ hasText: "下一条：再看看这张" })).toHaveCount(0)
    await expect(composer).toHaveValue("下一条：再看看这张")
    await expect(chip).toHaveCount(1)
    await expect(window.locator('[data-testid="composer-asset-chip"]:has([title*="b.png"])')).toHaveCount(1)
    await window.screenshot({ path: join(shots, "r4-jojo-retry-2-after.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

const R5 = {
  zh: {
    sentence: "看看这张图",
    edited: "看看这张图片吧",
    restored: "文字和图片已放回输入框，可以直接再发。",
    editThenSend: "改好后点发送就行，不会自动发出。"
  },
  en: {
    sentence: "check this image",
    edited: "check this image please",
    restored: "Your text and image are back in the input. You can send them again.",
    editThenSend: "Press Send when you're ready. Nothing goes out on its own."
  }
} as const

for (const lang of ["zh", "en"] as const) {
  test(`leo r5 fail closed（${lang}）：改了那一句 / 删了图 → 「再发一次」隐藏、第二行换成「改好后点发送…」；改回去立刻恢复`, async () => {
    test.setTimeout(180_000)
    const copy = R5[lang]
    const { app, window } = await boot({ ...dirs(), ENJOY_E2E_LANG: lang, ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_ONCE: "1" })
    try {
      const composer = window.getByTestId("composer-input")
      const chip = window.getByTestId("composer-asset-chip")
      const action = window.getByTestId("thread-credential-network-notice-action")
      const detail = window.getByTestId("thread-credential-network-notice-detail")
      await window.getByTestId("composer-attach").setInputFiles({ name: "r5.png", mimeType: "image/png", buffer: PNG })
      await expect(chip).toHaveCount(1, { timeout: 8_000 })
      await composer.fill(copy.sentence)
      await composer.press("Enter")
      await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 15_000 })
      await expect(action).toBeVisible()
      await expect(detail).toHaveText(copy.restored)
      await window.screenshot({ path: join(shots, `r5-${lang}-1-restored-with-button.png`) })
      // 改了那一句：按钮隐藏（不是置灰），第二行替换；× 还在。
      await composer.fill(copy.edited)
      await expect(action).toHaveCount(0)
      await expect(detail).toHaveText(copy.editThenSend)
      await expect(window.getByTestId("thread-credential-network-notice-dismiss")).toBeVisible()
      await window.screenshot({ path: join(shots, `r5-${lang}-2-hidden-edited.png`) })
      // 改回去：立刻恢复。
      await composer.fill(copy.sentence)
      await expect(action).toBeVisible()
      await expect(detail).toHaveText(copy.restored)
      // 删掉那张图：隐藏。
      await chip.first().hover()
      await chip.first().locator('button[aria-label*="r5.png"]').click({ force: true })
      await expect(chip).toHaveCount(0)
      await expect(action).toHaveCount(0)
      await expect(detail).toHaveText(copy.editThenSend)
      await window.screenshot({ path: join(shots, `r5-${lang}-3-hidden-chip-deleted.png`) })
      // 隐藏时什么都没自动发出去。
      await expect(window.locator('[data-chat-stage="true"]')).not.toContainText("stub-ok")
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("leo r5 MUST 2：回滚后切到别的会话再切回——卡和「再发一次」都在，点了只发那一句", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_ONCE: "1" })
  try {
    const composer = window.getByTestId("composer-input")
    const chip = window.getByTestId("composer-asset-chip")
    await window.getByTestId("composer-attach").setInputFiles({ name: "sw.png", mimeType: "image/png", buffer: PNG })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await composer.fill("切回来再发")
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 15_000 })
    const active = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const sid = await active.getAttribute("data-session-id")
    expect(sid).toBeTruthy()
    await window.getByTestId("sidebar-new-session").click()
    const row = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sid}"]`).first()
    await expect(row).toHaveAttribute("data-active", "false", { timeout: 8_000 })
    await row.locator("button").first().click()
    await expect(row).toHaveAttribute("data-active", "true", { timeout: 8_000 })
    await expect(composer).toHaveValue("切回来再发", { timeout: 10_000 })
    await expect(chip).toHaveCount(1, { timeout: 10_000 })
    const action = window.getByTestId("thread-credential-network-notice-action")
    await expect(action).toBeVisible({ timeout: 10_000 })
    await expect(window.getByTestId("thread-credential-network-notice-detail")).toHaveText("文字和图片已放回输入框，可以直接再发。")
    await window.screenshot({ path: join(shots, "r5-switch-back-1-card-and-button.png") })
    await action.click()
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage).toContainText("attached:sw.png", { timeout: 20_000 })
    await expect(chip).toHaveCount(0)
    await expect(composer).toHaveValue("")
    await window.screenshot({ path: join(shots, "r5-switch-back-2-resent.png") })
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
