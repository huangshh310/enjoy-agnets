/**
 * 用户词表守门：默认面禁止裸工具名、bundle id、§ 章节号。
 * 开发者文案档（HMAC / TTL / 裸动作）走显式白名单。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { en } from "./catalogs/en/index.ts"
import { zh } from "./catalogs/zh/index.ts"

/** 仅开发者文案档可留 HMAC / 裸动作 / bundle 模板。 */
const DEV_COPY_ALLOWLIST = new Set([
  "chat.hmacBoundNotice",
  "chat.desktopApprovalDevMeta",
  "chat.desktopBiasAppKey",
  "chat.paneDesktopAppKey"
])

/** 默认中文面禁止 Diff/diff；审查「高级」里的 git apply 可留工程词。 */
const DIFF_COPY_ALLOWLIST = new Set(["chat.reviewCopyGitApply"])
const DIFF_TERM_RE = /(?<![A-Za-z])[Dd]iff(?![A-Za-z])/

const TOOL_ID_RE = buildToolIdPattern()
const BUNDLE_ID_RE = /\b(?:com|org|net|io)\.[a-z][a-z0-9-]*\.[a-z0-9._-]+\b/i
const SECTION_RE = /§/

test("zh/en 默认词表不含裸工具名、bundle id、§", () => {
  for (const [locale, tree] of [
    ["zh", zh],
    ["en", en]
  ] as const) {
    for (const { key, value } of flattenEntries(tree)) {
      if (DEV_COPY_ALLOWLIST.has(key)) continue
      assert.doesNotMatch(value, TOOL_ID_RE, `${locale} ${key} leaks a tool id: ${value}`)
      assert.doesNotMatch(value, BUNDLE_ID_RE, `${locale} ${key} leaks a bundle id: ${value}`)
      assert.doesNotMatch(value, SECTION_RE, `${locale} ${key} leaks a section mark: ${value}`)
    }
  }
})

test("开发者文案白名单短且都在词表里", () => {
  assert.ok(DEV_COPY_ALLOWLIST.size <= 8)
  const keys = new Set(flattenEntries(zh).map((row) => row.key))
  for (const key of DEV_COPY_ALLOWLIST) {
    assert.ok(keys.has(key), `missing allowlisted key ${key}`)
  }
})

test("zh 默认词表不含 Diff/diff，高级 git apply 可留", () => {
  const keys = new Set(flattenEntries(zh).map((row) => row.key))
  for (const key of DIFF_COPY_ALLOWLIST) {
    assert.ok(keys.has(key), `missing Diff allowlisted key ${key}`)
  }
  assert.equal((zh as { chat: { reviewCopyGitApply: string } }).chat.reviewCopyGitApply, "复制 git apply 命令")
  for (const { key, value } of flattenEntries(zh)) {
    if (DIFF_COPY_ALLOWLIST.has(key)) continue
    assert.doesNotMatch(value, DIFF_TERM_RE, `zh ${key} leaks Diff: ${value}`)
  }
})

test("Dock / @菜单 / 线程工具名 / 自动化抽屉 / 说明页钉死 jojo 人话", () => {
  const z = zh as {
    chat: Record<string, string>
    nav: Record<string, string>
    settings: {
      usageNumberDesc: string
      setupGuide: { replayDesc: string }
      update: { devSkip: string }
      builtinTools: { browserBridgeTitle: string }
      providers: Record<string, string>
    }
    studio: {
      automations: Record<string, string>
      instructions: Record<string, string>
      instructionPresets: { minimalDiffs: { tag: string } }
    }
    pages: { knowledge: { sourcesHealthy: string } }
  }
  assert.equal(z.chat.desktopApprovalTtlFrozen, "等你决定，画面已定格在提问那一刻")
  assert.equal(z.chat.mentionDesktopSheetHint, "这台电脑上能操控的应用")
  assert.equal(z.chat.toolDesktop, "操作桌面")
  assert.equal(z.chat.waitingForApp, "等待应用…")
  assert.equal(z.chat.desktopApprovalVerbClick, "点击")
  assert.equal(z.chat.declined, "已拒绝")
  assert.equal(z.chat.newAgent, "新对话")
  assert.equal(z.chat.flagSession, "加星标")
  assert.equal(z.chat.reviewCommitStaged, "提交已暂存的改动")
  assert.equal(z.chat.reviewCommitChanges, "提交已暂存的改动")
  assert.equal(z.chat.reviewCopyUnifiedDiff, "复制全部改动")
  assert.equal(z.chat.reviewAdvanced, "高级")
  assert.equal(z.chat.intentGitTag, "改动")
  assert.equal(z.chat.intentGitDesc, "分析未提交的代码差异，排查潜在缺陷与风险")
  assert.equal(z.chat.approvalCycleHint, "工具审批策略 · 空输入时 Shift+Tab 在读取和编辑之间切换")
  assert.equal(z.chat.approvalChipHintReads, "读取：助手改文件或运行命令前会逐条问你")
  assert.equal(z.chat.approvalChipHintEdits, "编辑：助手可直接改文件，运行命令前仍会问你")
  assert.equal(z.chat.approvalChipHintAll, "全部：助手可直接改文件、运行命令，不再逐条问你")
  assert.equal(z.chat.desktopBiasHostHint, "让助手在这个应用里操作")
  assert.equal(z.chat.mentionScopeWorkspace, "项目")
  assert.equal(z.chat.fastMode, "快速")
  assert.equal(z.chat.fastModeHint, "优先更快出结果。")
  assert.doesNotMatch(z.chat.fastModeHint, /--fast/)
  assert.equal(z.chat.thinking, "思考中")
  assert.equal(z.chat.thinkingSources, "来源")
  assert.equal(z.chat.paneTerminalHint, "项目 Shell")
  assert.equal(z.chat.paneFilesHint, "项目目录与文件预览")
  assert.equal(z.chat.tokenUnit, "tok")
  assert.equal(z.nav.workspace, "项目")
  assert.equal(z.nav.groupWorkspace, "项目与扩展")
  assert.equal(z.settings.usageNumberDesc.includes("Composer"), false)
  assert.equal(z.settings.setupGuide.replayDesc, "再走一遍引擎安装、外观和打开项目。")
  assert.equal(z.settings.update.devSkip, "开发版本不检查更新。")
  assert.equal(z.chat.errorRetryHint, "这一轮没能完成，可以重试")
  assert.equal(z.chat.errorTitle, "模型这次没回完")
  assert.equal(z.chat.preparingHint, "正在准备…")
  assert.equal(z.chat.viewRawJson, "查看原始内容")
  assert.equal(z.chat.sourcesSheetFooter, "选中的文件可以回看；来自挂载或 MCP 的内容没有文件路径，无法回看。")
  assert.doesNotMatch(z.chat.approvalHintAll, /sudo|rm -rf|write_file|bash/)
  assert.doesNotMatch(z.chat.approvalToolQuestion, /\{name\}/)
  assert.equal(z.settings.builtinTools.browserBridgeTitle, "浏览器桥接")
  assert.equal(z.studio.automations.desc, "到点、保存文件或收到本机请求时，自动跑一轮。关掉应用就暂停。")
  assert.equal(z.studio.automations.workspaceHint, "在当前项目里运行")
  assert.equal(z.studio.automations.triggerHint, "选择什么时候运行")
  assert.equal(z.studio.automations.onSaveHint, "项目里有文件保存时运行 · 只在这台电脑 · 关掉应用就停")
  assert.equal(z.studio.automations.mode, "模式")
  assert.equal(z.studio.automations.runningBar, "正在运行")
  assert.equal(z.studio.automations.cronDaily, "每天 {time}")
  assert.equal(z.studio.automations.cronCustom, "自定义时间")
  assert.equal(z.studio.automations.missedGroupSame, "因{reason}错过 {n} 次 · {when}")
  assert.equal(z.studio.automations.missedGroupMixed, "错过 {n} 次 · 最近一次{reason} · {when}")
  assert.equal(
    (en as { studio: { automations: Record<string, string> } }).studio.automations.missedGroupMixed,
    "Missed {n} times · last time {reason} · {when}"
  )
  assert.equal(z.studio.automations.lastRunOk, "上次成功 · {when}")
  assert.equal(z.studio.automations.lastRunFailed, "上次出错 · {when}")
  assert.equal(z.chat.errorTitle, "模型这次没回完")
  assert.equal(z.chat.writing, "正在写")
  assert.equal(z.chat.placeholderRunning.includes("{mod}"), true)
  assert.equal(z.chat.placeholderRunning.includes("立即插话"), true)
  assert.equal(z.chat.runtimeSteer.includes("纠偏"), false)
  assert.equal(z.studio.automations.scheduleDaily, "每天")
  assert.equal(z.studio.automations.projectLabel, "项目")
  assert.equal(z.studio.automations.deleteTitle, "删除这条自动化\uFF1F")
  assert.equal(z.studio.automations.discardTitle, "放弃未保存的修改\uFF1F")
  assert.equal(z.studio.automations.discardConfirm, "放弃")
  assert.equal(z.studio.automations.keepEditing, "继续编辑")
  assert.equal(z.settings.providers.customDesc, "填好地址和密钥即可。用不到的协议留空。")
  assert.equal(z.settings.providers.addKey, "再添加一个密钥")
  assert.equal(z.settings.providers.addCustom, "添加自定义端点")
  assert.equal(z.settings.providers.baseUrl, "接口地址")
  assert.equal(z.studio.instructionPresets.minimalDiffs.tag, "最小改动")
  assert.equal(z.pages.knowledge.sourcesHealthy, "来源均在项目内")
  assert.equal(z.studio.instructions.desc.includes("系统提示"), false)
  assert.doesNotMatch(z.studio.instructions.badge, /System Prompt|session\/prompt/)
})

const MOD_COPY_ALLOWLIST = new Set([
  "settings.shortcuts.layoutMac",
  "settings.shortcuts.needsModifier"
])

test("默认词表不写死修饰键符号，运行态快捷键走平台修饰键", () => {
  for (const [locale, tree] of [
    ["zh", zh],
    ["en", en]
  ] as const) {
    for (const { key, value } of flattenEntries(tree)) {
      if (MOD_COPY_ALLOWLIST.has(key)) continue
      assert.equal(value.includes("\u2318"), false, `${locale} ${key} hard-codes a mac modifier`)
    }
  }
  const z = zh as { chat: Record<string, string> }
  assert.match(z.chat.placeholderRunning, /\{mod\}/)
  assert.match(z.chat.runtimeSteer, /\{mod\}/)
  assert.match(z.chat.mentionSlashHint, /\{mod\}/)
})

test("中文词条不用半角 ? !，确认问句走全角问号", () => {
  const halfWidth = /[?!]/
  const cjk = /[\u4e00-\u9fff]/
  for (const { key, value } of flattenEntries(zh)) {
    if (!cjk.test(value)) continue
    assert.doesNotMatch(value, halfWidth, `zh ${key} uses half-width punct: ${value}`)
  }
  const automations = (zh as { studio: { automations: { deleteTitle: string; discardTitle: string } } })
    .studio.automations
  assert.equal(automations.deleteTitle.endsWith("\uFF1F"), true)
  assert.equal(automations.discardTitle.endsWith("\uFF1F"), true)
})

function buildToolIdPattern(): RegExp {
  const names = [
    "read_file",
    "list_dir",
    "repo_outline",
    "todo_write",
    "ask_user_questions",
    "submit_plan",
    "edit_file",
    "write_file",
    "code_mode",
    "git_status",
    "git_diff",
    "git_log",
    "git_commit",
    "git_branch",
    "git_push",
    "browser_navigate",
    "browser_extract_content",
    "desktop_\\w+",
    "desktop_\\*"
  ]
  return new RegExp(`\\b(?:${names.join("|")})\\b`)
}

function flattenEntries(node: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (typeof node === "string") return prefix ? [{ key: prefix, value: node }] : []
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return flattenEntries(value, next)
  })
}
