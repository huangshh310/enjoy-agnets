/**
 * jojo P1（#136 r6 gate）：会话 B 在跑、停在写盘审批时，从引擎面板导入一条本机 ACP 会话——
 * 导入的会话必须是空闲的：没有 B 的审批卡 / 执行中 / 停止按钮；B 停到后台继续等审批，回到 B 卡还在、批的是 B。
 * 另：导入的会话（0 条消息）离开时 / 重启后都还在侧栏（luna g157b）；自定义 ACP 助手也能列出本机会话（luna -71）。
 * 本机助手用一个假的自定义 ACP 助手（NDJSON：initialize 广告 session、session/list 回两条），不碰真 CLI。
 * 假助手只在「入库的 env（FAKE_ACP_TOKEN）到了、进程 cwd 和 session/list 的 cwd 都是入库的自定义目录」时才列会话，
 * 守住自定义助手 env / cwd 一路传到 spawn（leo #160）。
 * 末段（luna C1 / C2）：重启后从刚点开的空「新对话」导入另一条——侧栏不多出空「新对话」；
 * 在导入的会话里发送失败，卡上说「连不上假本机助手」，不说聊天密钥档案名（E2E Stub Key）。
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/acp-import-isolation")
const IMPORTED_TITLE = "本机助手的旧会话"
const SECOND_TITLE = "本机助手的另一条会话"
const AGENT_TOKEN = "luna-71-env-ok"

const fakeAcp = (agentCwd: string) => `#!/usr/bin/env node
// e2e 假 ACP 助手：只答 initialize / session/list，其余请求回空结果。
// env / cwd 不对（没按入库的自定义助手起进程）就列空，导入面板里什么都没有。
const wired = process.env.FAKE_ACP_TOKEN === ${JSON.stringify(AGENT_TOKEN)} && process.cwd() === ${JSON.stringify(agentCwd)}
let buf = ""
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\\n")
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  buf += chunk
  let i
  while ((i = buf.indexOf("\\n")) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line || !line.startsWith("{")) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.id === undefined || !msg.method) continue
    if (msg.method === "initialize") {
      send({ id: msg.id, result: { protocolVersion: msg.params?.protocolVersion ?? 1, capabilities: { session: {} }, agentCapabilities: {} } })
    } else if (msg.method === "session/list") {
      const ok = wired && msg.params?.cwd === ${JSON.stringify(agentCwd)}
      const sessions = ok
        ? [
            { sessionId: "fake-acp-1", cwd: msg.params.cwd, title: ${JSON.stringify(IMPORTED_TITLE)} },
            { sessionId: "fake-acp-2", cwd: msg.params.cwd, title: ${JSON.stringify(SECOND_TITLE)} }
          ]
        : []
      send({ id: msg.id, result: { sessions } })
    } else {
      send({ id: msg.id, result: {} })
    }
  }
})
`

function setup() {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-acpimp-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const binDir = mkdtempSync(join(tmpdir(), "enjoy-acpimp-bin-"))
  const agent = join(binDir, "acp-agent")
  // 自定义工作目录（cwdMode: custom），和工作区根不同：走错 cwd 就列不出来。
  const agentCwd = realpathSync(mkdtempSync(join(tmpdir(), "enjoy-acpimp-cwd-")))
  writeFileSync(agent, fakeAcp(agentCwd))
  chmodSync(agent, 0o755)
  return {
    agent,
    agentCwd,
    env: { ENJOY_E2E_WORKSPACE: workspace, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-acpimp-ud-")) }
  }
}

/**
 * 直接把假助手写进库（settings.agentTools.customAgents）。走 agentTools.upsertCustom 会去要系统钥匙串
 * （Linux CI / xvfb 没有，env 为空也要），和这里要验的导入无关。
 */
function seedCustomAgent(userData: string, command: string, cwd: string) {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    // env 明文入库：没有钥匙串时 decryptEnvValues 原样返回（只加密带前缀的值）。
    const row = { id: "custom:fake-acp", label: "假本机助手", command, args: [], env: { FAKE_ACP_TOKEN: AGENT_TOKEN }, cwdMode: "custom", cwd, enabled: true }
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run("agentTools.customAgents", JSON.stringify([row]))
  } finally {
    db.close()
  }
}

async function boot(env: Record<string, string>) {
  const app = await relaunchElectron({ ...process.env, ENJOY_E2E_STUB: "1", ENJOY_E2E_LANG: "zh", ...env })
  const window = await firstWindow(app)
  const skip = window.getByRole("button", { name: "跳过设置" })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

const shot = (window: Page, name: string) => window.screenshot({ path: join(shots, `${name}.png`) })

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})

test("B 等审批时导入本机 ACP 会话：导入的会话空闲、不挂 B 的卡；回到 B 卡还在；导入的会话离开 / 重启后仍在侧栏", async () => {
  test.setTimeout(300_000)
  const { agent, agentCwd, env } = setup()
  // 先起一次建库（跑迁移），关掉后写入假助手，再起。
  let { app, window } = await boot(env)
  await closeForRelaunch(app)
  seedCustomAgent(env.ENJOY_E2E_USERDATA, agent, agentCwd)
  ;({ app, window } = await boot(env))
  try {
    const composer = window.getByTestId("composer-input")
    const activeRow = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const stage = window.locator('[data-chat-stage="true"]')
    const approve = window.getByTestId("approval-allow")
    const stop = window.getByTestId("composer-stop")

    // 会话 B：very slow 中途停在写盘审批。
    await composer.fill("very slow 乙在跑")
    await composer.press("Enter")
    await expect(approve).toBeVisible({ timeout: 40_000 })
    const b = await activeRow.getAttribute("data-session-id")
    await shot(window, "acp-1-B-waiting-approval")

    // 引擎面板 → 假本机助手 → 导入本机会话 → 点那一条。
    await window.getByTestId("composer-engine-chip").click()
    const panel = window.getByTestId("agent-picker-panel")
    await expect(panel).toBeVisible()
    await panel.getByRole("tab", { name: "假本机助手" }).click()
    await panel.getByRole("button", { name: "导入本机会话" }).click()
    const row = panel.getByRole("button", { name: IMPORTED_TITLE })
    await expect(row, "自定义助手列出了本机会话（luna -71）").toBeVisible({ timeout: 20_000 })
    await shot(window, "acp-2-custom-agent-lists-sessions")
    await row.click()

    // 导入的会话：空闲，不挂 B 的卡 / 执行中 / 停止。
    await expect(activeRow).not.toHaveAttribute("data-session-id", b ?? "", { timeout: 15_000 })
    const imported = await activeRow.getAttribute("data-session-id")
    await expect(window.locator('[data-testid="sidebar-session-row"][data-active="true"]', { hasText: IMPORTED_TITLE }).first()).toBeVisible()
    await window.keyboard.press("Escape")
    await expect(approve, "导入的会话没有 B 的审批卡").toHaveCount(0)
    await expect(stop, "导入的会话没有停止按钮").toHaveCount(0)
    await expect(stage).not.toContainText("乙在跑")
    await expect(composer).not.toHaveAttribute("placeholder", /任务进行中/)
    await shot(window, "acp-3-imported-idle")

    // 左上返回到 B：B 的卡还在、仍在跑；在 B 里批准，B 继续出字。
    await window.getByTestId("nav-back").click()
    const rowB = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${b}"]`)
    await expect(rowB).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    await expect(approve, "回到 B，B 的审批卡还在").toBeVisible({ timeout: 10_000 })
    await expect(stage).toContainText("乙在跑")
    await shot(window, "acp-4-back-to-B-card-kept")
    await approve.click()
    await expect(stage).toContainText("ten", { timeout: 60_000 })
    await shot(window, "acp-5-B-approved-finished")

    // 导入的会话（0 条消息）离开后仍在侧栏。
    const importedRow = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${imported}"]`)
    await window.waitForTimeout(1_500)
    await expect(importedRow, "离开后导入的会话还在").toHaveCount(1)

    // 重启后仍在侧栏。这次带上首发失败夹具和一个聊天密钥档案（E2E Stub Key），给末段 C2 用。
    await closeForRelaunch(app)
    ;({ app, window } = await boot({ ...env, ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_CHAT_READY: "key" }))
    const afterRestart = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${imported}"]`)
    await expect(afterRestart, "重启后导入的会话还在").toHaveCount(1, { timeout: 15_000 })
    await expect(afterRestart).toContainText(IMPORTED_TITLE)
    await shot(window, "acp-6-imported-kept-after-restart")

    // luna C1：点「新对话」（立刻建一条空会话），在它上面从引擎面板导入另一条——空新对话离开即删，侧栏不多一条。
    const treeRows = window.locator('[data-testid="sidebar-session-row"][data-session-surface="tree"]')
    const newChatRows = treeRows.filter({ hasText: "新对话" })
    await window.getByTestId("sidebar-new-session").click()
    await expect(newChatRows, "点「新对话」建了一条空会话").toHaveCount(1, { timeout: 10_000 })
    const emptyNew = await window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first().getAttribute("data-session-id")
    await window.getByTestId("composer-engine-chip").click()
    const panel2 = window.getByTestId("agent-picker-panel")
    await expect(panel2).toBeVisible()
    await panel2.getByRole("tab", { name: "假本机助手" }).click()
    await panel2.getByRole("button", { name: "导入本机会话" }).click()
    const second = panel2.getByRole("button", { name: SECOND_TITLE })
    await expect(second).toBeVisible({ timeout: 20_000 })
    await second.click()
    await expect(window.locator('[data-testid="sidebar-session-row"][data-active="true"]', { hasText: SECOND_TITLE }).first()).toBeVisible({ timeout: 15_000 })
    await window.keyboard.press("Escape")
    await window.waitForTimeout(1_500)
    await expect(window.locator(`[data-testid="sidebar-session-row"][data-session-id="${emptyNew}"]`), "空新对话已删").toHaveCount(0)
    await expect(newChatRows, "从新对话导入后侧栏没有多出空「新对话」").toHaveCount(0)
    await expect(treeRows.filter({ hasText: IMPORTED_TITLE })).toHaveCount(1)
    await expect(treeRows.filter({ hasText: SECOND_TITLE })).toHaveCount(1)
    await shot(window, "acp-7-import-from-new-chat-no-extra-row")

    // luna C2：导入的会话（假本机助手）里发送失败，卡上说引擎名，不说聊天密钥档案名。
    const composer2 = window.getByTestId("composer-input")
    await composer2.fill("你好")
    await composer2.press("Enter")
    const card = window.getByTestId("thread-credential-network-notice")
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card).toContainText("连不上假本机助手")
    await expect(card).not.toContainText("E2E Stub Key")
    await shot(window, "acp-8-failure-card-names-engine")
  } finally {
    await closeForRelaunch(app)
  }
})
