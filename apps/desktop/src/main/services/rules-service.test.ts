/**
 * 多 Agent 规则服务单测：扫描、Frontmatter 解析与写入管理
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createRuleFile,
  deleteRuleFile,
  listDiscoveredRules,
  readRuleContent
} from "./rules-service.ts"

test("Rules 服务能够扫描并写入 AGENTS.md 与 Cursor MDC 规则", () => {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "enjoy-rules-test-"))
  try {
    // 1. 创建 AGENTS.md
    const createdAgentsMd = createRuleFile({
      targetKind: "agents_md",
      name: "AGENTS.md",
      content: "# Team Repo Contract\nInvariants and guidelines.",
      workspacePath: tempWorkspace
    })
    assert.equal(createdAgentsMd.name, "AGENTS.md")
    assert.ok(existsSync(createdAgentsMd.filePath))

    // 2. 创建 Cursor MDC 规则
    const createdMdc = createRuleFile({
      targetKind: "cursor_mdc",
      name: "clean-diffs",
      description: "Clean diffs rule",
      globs: "*.ts,*.tsx",
      content: "- Use minimal surgical diffs.",
      workspacePath: tempWorkspace
    })
    assert.equal(createdMdc.name, "clean-diffs")
    assert.ok(existsSync(createdMdc.filePath))

    const content = readRuleContent(createdMdc.filePath)
    assert.ok(content.includes("globs: *.ts,*.tsx"))
    assert.ok(content.includes("minimal surgical diffs"))

    // 3. 扫描该工作区规则
    const scanned = listDiscoveredRules({ workspacePath: tempWorkspace })
    assert.ok(scanned.length >= 2)

    const foundMdc = scanned.find((r) => r.name === "clean-diffs")
    assert.ok(foundMdc)
    assert.equal(foundMdc.agentKind, "cursor_mdc")
    assert.equal(foundMdc.globs, "*.ts,*.tsx")

    // 4. 删除
    const deleted = deleteRuleFile(createdMdc.filePath)
    assert.ok(deleted)
    assert.ok(!existsSync(createdMdc.filePath))
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})
