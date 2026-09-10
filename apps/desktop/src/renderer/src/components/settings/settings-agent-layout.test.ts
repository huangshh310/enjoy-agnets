/**
 * 本机 CLI 必须先管理台后说明书，避免再把矩阵顶到卡片前面。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

test("本机 CLI 页顺序是顶栏 → 卡片 → 能力说明", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "settings-agent.tsx"), "utf8")
  const hub = src.indexOf("<AgentToolsCommandHub")
  const page = src.indexOf("<AgentToolsPage")
  const docs = src.indexOf("<AgentCapabilityDocs")
  assert.ok(hub >= 0 && page >= 0 && docs >= 0)
  assert.ok(hub < page && page < docs)
})

test("自定义 ACP 编辑是右侧抽屉，不是居中 Dialog", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/custom-acp-agent-dialog.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SettingsSideDrawer"))
  assert.ok(!src.includes("DialogContent"))
})

test("智能体配置是右侧抽屉，不是居中 Dialog", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const drawer = readFileSync(join(dir, "agent-tools/agent-tool-config-drawer.tsx"), "utf8")
  assert.ok(drawer.includes("SettingsSideDrawer"))
  assert.ok(!drawer.includes("DialogContent"))
})

test("供应商添加/编辑是右侧抽屉，不是居中 Dialog", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "providers/provider-editor-drawer.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SettingsSideDrawer"))
  assert.ok(!src.includes("DialogContent"))
})

test("凭证是可筛选下拉，不是电台列表", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/agent-tool-source-menu.tsx"),
    "utf8"
  )
  assert.ok(src.includes("AgentToolSourceMenu"))
  assert.ok(src.includes("BIND_SEARCH_AFTER"))
  assert.ok(!src.includes("ChoiceShell"))
})

test("这个助手用在官方账号区之前，绑了档案不得把 inspect 当英雄", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "agent-tools")
  const cli = readFileSync(join(dir, "agent-tool-config-cli.tsx"), "utf8")
  const panel = readFileSync(join(dir, "agent-tool-account-panel.tsx"), "utf8")
  const provider = cli.indexOf("<AgentToolProvider")
  const account = cli.indexOf("<AgentToolAccountPanel")
  assert.ok(provider >= 0 && account >= 0 && provider < account)
  assert.ok(panel.includes("officialAccountRole"))
  assert.ok(panel.includes("AgentToolAccountAside"))
  const aside = readFileSync(join(dir, "agent-tool-account-aside.tsx"), "utf8")
  assert.ok(!aside.includes("accountCurrentModel"))
  assert.ok(!aside.includes("quotaInfo"))
})
