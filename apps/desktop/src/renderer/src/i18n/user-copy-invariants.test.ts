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

test("Dock / @菜单 / 线程工具名 / 自动化抽屉 / 说明页钉死 jojo 人话", () => {
  const z = zh as {
    chat: Record<string, string> & {
      noProjectEmpty: string
      noChatRouteNotice: string
      needModelNotice: string
      adoptedDefaultRouteToast: string
    }
    nav: Record<string, string>
    settings: {
      usageNumberDesc: string
      secretWrite: {
        unavailableTitle: string
        unavailableBody: string
        saveNeedsKeychain: string
        writeFailedKeychain: string
        failed: string
      }
      setupGuide: {
        replayDesc: string
        replay: string
        connectLocalUnverified: string
        connectLocalUnverifiedWhy: string
        goVerify: string
        workspaceTitle: string
        capEnginesBody: string
        moreEngines: string
      }
      agentTools: { manageProviders: string }
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
  assert.equal(
    z.settings.secretWrite.unavailableTitle,
    "这台电脑没有可用的系统钥匙串，暂时没法安全地保存密钥。"
  )
  assert.equal(
    z.settings.secretWrite.unavailableBody,
    "装好系统钥匙串（比如 GNOME 密钥环）后，重启 Enjoy 再来添加。"
  )
  assert.equal(z.settings.secretWrite.saveNeedsKeychain, "需要系统钥匙串才能保存")
  assert.equal(
    z.settings.secretWrite.writeFailedKeychain,
    "没存上：系统钥匙串现在用不了，密钥不会以明文保存。请确认钥匙串已解锁后再点保存。"
  )
  assert.equal(z.settings.secretWrite.failed, "没存上，请再试一次")
  assert.doesNotMatch(z.settings.secretWrite.writeFailedKeychain, /重启/)
  assert.equal(z.settings.setupGuide.replayDesc, "再走一遍连模型、装引擎、外观和打开文件夹。")
  assert.equal(z.settings.setupGuide.replay, "重新打开入门向导")
  assert.equal(z.chat.noProjectEmpty, "选一个文件夹开始。Enjoy 只在你选的文件夹里读写。")
  assert.equal(z.chat.noChatRouteNotice, "还差一步：连一个模型，才能发消息。草稿会留着。")
  assert.equal(z.chat.needModelNotice, "还差一步：选一个模型，才能发消息。草稿会留着。")
  assert.equal(z.chat.adoptedDefaultRouteToast, "之后的新对话默认用「{name}」，可在设置里改。")
  assert.equal(z.chat.goConnect, "去连接")
  assert.equal(z.settings.setupGuide.connectLocalUnverified, "未验证")
  assert.equal(z.settings.setupGuide.connectLocalUnverifiedWhy, "这是远端地址，还没确认能连上，所以现在不能用来对话。")
  assert.equal(z.settings.setupGuide.goVerify, "去验证")
  assert.equal(z.settings.providers.pickTitle, "选一家，粘贴密钥")
  assert.equal(z.settings.setupGuide.workspaceTitle, "打开第一个项目")
  assert.equal(z.settings.setupGuide.capEnginesBody, "Enjoy 本地和这台电脑上已经装好的助手，可以在同一条对话里换着用。模型和登录还在各自那边。")
  assert.equal(z.settings.setupGuide.moreEngines, "更多引擎")
  assert.equal(z.settings.providers.emptyTitle, "还没有连接模型")
  assert.equal(z.chat.noProvidersYet, "还没有连接模型")
  assert.equal(z.chat.manageProviders, "管理模型连接")
  assert.equal(z.settings.agentTools.manageProviders, "管理模型连接")
  assert.equal(z.chat.noProjectNewChatHint, "先选一个文件夹，才能开新对话。")
  assert.equal(z.settings.update.devSkip, "开发版本不检查更新。")
  assert.equal(z.settings.builtinTools.browserBridgeTitle, "浏览器桥接")
  assert.equal(z.studio.automations.desc, "到点、保存文件或收到本机请求时，自动跑一轮。关掉应用就暂停。")
  assert.equal(z.studio.automations.workspaceHint, "在当前项目里运行")
  assert.equal(z.studio.automations.triggerHint, "选择什么时候运行")
  assert.equal(z.studio.automations.onSaveHint, "项目里有文件保存时运行 · 只在这台电脑 · 关掉应用就停")
  assert.equal(z.studio.automations.mode, "模式")
  assert.equal(z.studio.automations.runningBar, "正在运行")
  assert.equal(z.studio.automations.cronDaily, "每天 {time}")
  assert.equal(z.studio.automations.cronCustom, "自定义时间")
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
  assert.equal(z.chat.sourcesSheetFooter, "点文件可以在右侧打开。")
  assert.doesNotMatch(z.chat.sourcesSheetFooter, /可聚焦|path|跳转/)
})

test("钥匙串中文不摊 libsecret / DBus / keychain 英文", () => {
  const leak = /libsecret|DBus|keychain|isEncryptionAvailable|safeStorage|gnome-keyring/i
  const secretWrite = (zh as { settings: { secretWrite: Record<string, string> } }).settings.secretWrite
  for (const [key, value] of Object.entries(secretWrite)) {
    assert.doesNotMatch(value, leak, `zh settings.secretWrite.${key} leaks keychain English: ${value}`)
  }
})

test("用户可见词表不含供应商密钥，统一连接模型 / API 密钥", () => {
  for (const { key, value } of flattenEntries(zh)) {
    assert.doesNotMatch(value, /供应商密钥/, `zh ${key} uses banned copy: ${value}`)
  }
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
