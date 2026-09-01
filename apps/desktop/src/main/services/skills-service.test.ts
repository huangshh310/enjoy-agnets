/**
 * Skills 服务单测：扫描、Frontmatter 解析与创建管理
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createSkillPackage,
  deleteSkillPackage,
  listInstalledSkills,
  readSkillContent
} from "./skills-service.ts"

test("Skills 服务能够在指定工作区创建并扫描技能", () => {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "enjoy-skills-test-"))
  try {
    const created = createSkillPackage({
      name: "my-test-skill",
      description: "Test Skill Description",
      scope: "workspace",
      workspacePath: tempWorkspace,
      content: `---
name: my-test-skill
description: Test Skill Description
trigger: /test-cmd
---
# Test Content
`
    })

    assert.equal(created.name, "my-test-skill")
    assert.ok(existsSync(created.skillFilePath))

    const content = readSkillContent(created.skillFilePath)
    assert.ok(content.includes("/test-cmd"))

    // 扫描该工作区
    const scanned = listInstalledSkills({ workspacePath: tempWorkspace })
    const found = scanned.find((s) => s.name === "my-test-skill")
    assert.ok(found)
    assert.equal(found.description, "Test Skill Description")
    assert.equal(found.trigger, "/test-cmd")
    assert.equal(found.scope, "workspace")

    // 删除
    const deleted = deleteSkillPackage(created.directoryPath)
    assert.ok(deleted)
    assert.ok(!existsSync(created.directoryPath))
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})
