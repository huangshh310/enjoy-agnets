/**
 * 本轮 C 端清扫守门：替换掉的行话不能回到默认词表。
 * 开发者指标档（pages.observability.*）豁免。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zh } from "./catalogs/zh/index.ts"
import { chordGlyphs } from "../components/settings/keybindings/keybinding-format.ts"

const DEV_COPY_ALLOWLIST = new Set([
  "chat.hmacBoundNotice",
  "chat.desktopApprovalDevMeta",
  "chat.desktopBiasAppKey",
  "chat.paneDesktopAppKey"
])

const DEV_CATALOG_PREFIXES = ["pages.observability."]

const CEND_JARGON = [
  "Inbox",
  "会话档案",
  "权限停靠",
  "/computer-use",
  "无观察不装在控",
  "真源",
  "#/mcp",
  "#/skills",
  "注册 Server",
  "主进程 vault",
  "主进程 Vault",
  "PTY",
  "Registry",
  "Composer",
  "Local APM",
  "curated",
  "年度贡献",
  "高负载深度推理",
  "保持开发节奏",
  "硬件安全",
  "密钥已托管",
  "Enjoy Agents Desktop",
  "Linux x86_64",
  "Weekly",
  "Monthly",
  "Yearly",
  "匿名使用统计",
  "帮助改进 Enjoy",
  "不上传",
  "只存在本机",
  "只在本机",
  "Esc 停一手势",
  "停一手势",
  "PATH 上没有二进制"
]

test("C 端词表不含本轮清扫掉的行话；开发者指标档豁免", () => {
  for (const { key, value } of flattenEntries(zh)) {
    if (DEV_COPY_ALLOWLIST.has(key)) continue
    if (DEV_CATALOG_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
    for (const term of CEND_JARGON) {
      const hit = wordBoundaryTerms.has(term) ? new RegExp(`\\b${term}\\b`, "i") : term
      if (typeof hit === "string") {
        assert.equal(value.includes(hit), false, `zh ${key} still has “${term}”: ${value}`)
      } else {
        assert.doesNotMatch(value, hit, `zh ${key} still has “${term}”: ${value}`)
      }
    }
  }
})

test("luna 清扫钉死 Inbox / 遥测 / 项目 / 助手目录等人话", () => {
  const pages = zh as {
    pages: {
      inbox: Record<string, string>
      account: {
        security: {
          vaultTitle: string
          vaultProtected: string
          vaultProtectedOther: string
          thisComputer: string
        }
        heatmap: Record<string, string>
        hero: { contributions: string; yearSpend: string }
      }
      mcp: { registerServer: string }
    }
    settings: {
      telemetry: Record<string, string>
      workspace: Record<string, string>
      agentTools: { tabRegistry: string }
      registry: { title: string; notReadyHint: string }
      extensions: Record<string, string>
      shortcuts: { terminalDesc: string; send: string }
      computerUse: { guideStart: string }
      builtinTools: { screenVisualsDesc: string }
    }
  }
  assert.equal(
    pages.pages.inbox.emptyHint,
    "只列要拍板、待验收和失败的。进行中的在侧栏，已完成的不进这里。"
  )
  assert.equal(pages.pages.inbox.decideHint, "在对话里点批准或拒绝。")
  assert.equal(pages.pages.inbox.openHint, "点左边一条打开对话。")
  assert.equal(pages.settings.telemetry.recordLocal, "记录运行数据")
  assert.equal(pages.settings.telemetry.recordLocalDesc, "默认记录在这台电脑上。")
  assert.equal(
    pages.settings.telemetry.recordLocalDescOtel,
    "默认记录在这台电脑上。同时发送到你配置的地址。"
  )
  assert.equal(pages.settings.telemetry.helpImprove, pages.settings.telemetry.recordLocal)
  assert.equal(pages.settings.telemetry.collectDesc.includes("默认记录在这台电脑上"), true)
  assert.equal(pages.settings.telemetry.collectDescOtel.includes("同时发送到你配置的地址"), true)
  assert.equal(pages.settings.workspace.strictlyJailed, "助手只能改这个项目里的文件")
  assert.equal(pages.settings.workspace.allowOutside, "允许访问项目外的文件")
  assert.equal(pages.settings.workspace.monorepo, "这个仓库里有多个子项目")
  assert.equal(pages.settings.agentTools.tabRegistry, "助手目录")
  assert.equal(pages.settings.registry.title, "助手目录")
  assert.equal(
    pages.settings.registry.notReadyHint,
    "这台电脑上还没装。能一键安装的点「一键安装」，否则复制命令自己装。"
  )
  assert.equal(pages.settings.extensions.openMcp, "打开 MCP")
  assert.equal(pages.settings.extensions.openSkills, "打开技能")
  assert.equal(pages.settings.extensions.skillsTitle, "技能")
  assert.equal(pages.pages.account.security.vaultTitle, "本机加密存储")
  assert.equal(pages.pages.account.security.vaultProtected, "密钥存在系统钥匙串")
  assert.equal(pages.pages.account.security.vaultProtectedOther, "密钥存在系统密钥库")
  assert.equal(pages.pages.account.security.thisComputer, "这台电脑 · {os}")
  assert.equal(pages.pages.account.hero.contributions, "本年花费约")
  assert.equal(pages.pages.account.hero.yearSpend, "本年花费约 {amount}")
  assert.equal(pages.pages.account.heatmap.weekly, "周")
  assert.equal(pages.pages.account.heatmap.monthly, "月")
  assert.equal(pages.pages.account.heatmap.yearly, "年")
  assert.equal(pages.settings.shortcuts.terminalDesc.includes("终端"), true)
  assert.equal(pages.settings.shortcuts.send, "发送消息 / 运行助手")
  assert.equal(pages.settings.computerUse.guideStart.includes("/computer-use"), false)
  assert.equal(
    pages.settings.builtinTools.screenVisualsDesc,
    "执行态操控桌面时显示冷静蓝边与「正在操控」顶栏。按 Esc 或顶栏「停止」立刻停下。"
  )
  assert.equal(pages.pages.mcp.registerServer, "添加服务")
  assert.equal((zh as { chat: { overlayEscHint: string } }).chat.overlayEscHint, "按 Esc 停止")
})

test("侧栏快速搜索用平台键位，不写死 ⌘L", () => {
  const sidebar = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../components/ai-chat/ai-chat-sidebar.tsx"),
    "utf8"
  )
  assert.equal(sidebar.includes("⌘L"), false)
  assert.equal(sidebar.includes("chordGlyphs"), true)
  assert.deepEqual(chordGlyphs("mod+l", false), ["Ctrl", "L"])
  assert.deepEqual(chordGlyphs("mod+l", true), ["⌘", "L"])
})

const wordBoundaryTerms = new Set([
  "curated",
  "Composer",
  "Registry",
  "Inbox",
  "PTY",
  "Weekly",
  "Monthly",
  "Yearly"
])

function flattenEntries(node: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (typeof node === "string") return prefix ? [{ key: prefix, value: node }] : []
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return flattenEntries(value, next)
  })
}
