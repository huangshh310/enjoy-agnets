/**
 * jojo gate2（#136）真机路径：
 * - P1：出字前失败回滚后，附件和字一起回输入框；重启后草稿附件仍在（session_draft_assets）。
 * - P2：新会话第一句被回滚，侧栏标题不留乐观标题 / 生成的 stub-title。
 * - P2：默认路线解析不出档案时，「改密钥」退回设置页「添加 API 密钥」，不哑掉。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/pre-output-rollback-gate2")
const TEXT = "看看这张图里的报错"

/**
 * stub 档案都没有 vision：真图会先被视觉闸（model_needs_vision）挡掉、走不到出字前失败。
 * 用文本附件走同一条资产 → file 部件 → 草稿附件路径；PNG 由 pre-output-rollback 行为测试覆盖。
 */
const NOTE = { name: "报错日志.txt", mimeType: "text/plain", buffer: Buffer.from("TypeError: x is undefined\n") }

async function boot(env: Record<string, string>) {
  const app = await relaunchElectron({ ...process.env, ENJOY_E2E_STUB: "1", ENJOY_E2E_LANG: "zh", ...env })
  const window = await firstWindow(app)
  const skip = window.getByRole("button", { name: "跳过设置" })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

function dirs() {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-g2-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return { ENJOY_E2E_WORKSPACE: workspace, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-g2-ud-")) }
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})

test("P1 + P2：带图首句出字前失败 → 附件和字都回输入框、标题不留生成题；重启后附件仍在草稿", async () => {
  test.setTimeout(180_000)
  const env = { ...dirs(), ENJOY_E2E_SEND: "unreachable" }
  let { app, window } = await boot(env)
  try {
    await window.getByTestId("composer-attach").setInputFiles(NOTE)
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 8_000 })
    const composer = window.getByTestId("composer-input")
    await composer.fill(TEXT)
    await window.screenshot({ path: join(shots, "01-before-send.png") })
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 15_000 })
    await expect(composer).toHaveValue(TEXT)
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 8_000 })
    await expect(window.getByTestId("composer-asset-chip")).toContainText("报错日志")
    // 标题精炼（stub 回 stub-title）有时间跑完，也不能留在侧栏。
    await window.waitForTimeout(3_000)
    const rows = window.getByTestId("sidebar-session-row")
    await expect(rows.filter({ hasText: "stub-title" })).toHaveCount(0)
    await expect(rows.filter({ hasText: TEXT })).toHaveCount(0)
    await window.screenshot({ path: join(shots, "02-rolled-back-attachment-and-title.png") })
    await closeForRelaunch(app)
    ;({ app, window } = await boot(env))
    const row = window.getByTestId("sidebar-session-row").first()
    if ((await row.count()) > 0) await row.click()
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 12_000 })
    await expect(window.getByTestId("composer-asset-chip")).toContainText("报错日志")
    await expect(window.getByTestId("composer-input")).toHaveValue(TEXT)
    await expect(window.getByTestId("sidebar-session-row").filter({ hasText: "stub-title" })).toHaveCount(0)
    await window.screenshot({ path: join(shots, "03-after-restart-draft-attachment.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("P2：默认路线解析不出档案时「改密钥」打开添加 API 密钥，不哑掉", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "rejected" })
  try {
    const composer = window.getByTestId("composer-input")
    await composer.fill("测试密钥无效")
    await composer.press("Enter")
    const notice = window.getByTestId("thread-credential-invalid-notice")
    await expect(notice).toBeVisible({ timeout: 15_000 })
    // luna P2 定稿：认不出供应商、也没有端点地址时说通用的「模型服务」，不说档案名。
    await expect(notice).toContainText("密钥没通过：模型服务 不认这把密钥")
    await window.waitForTimeout(3_000)
    await expect(window.getByTestId("sidebar-session-row").filter({ hasText: "stub-title" })).toHaveCount(0)
    await window.screenshot({ path: join(shots, "04-rejected-notice.png") })
    await notice.getByTestId("thread-credential-invalid-notice-action").click()
    await window.waitForFunction(
      // 默认 ollama 桩路线解析不出档案（卡上写「模型服务」）：必须退回添加 API 密钥。
      () => location.hash.includes("settings/providers") && location.hash.includes("create=official"),
      undefined,
      { timeout: 8_000 }
    )
    await expect(window.getByText("选一家，粘贴密钥")).toBeVisible({ timeout: 8_000 })
    await window.screenshot({ path: join(shots, "05-fixkey-opens-add-key.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
