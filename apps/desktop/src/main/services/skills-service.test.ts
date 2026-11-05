/**
 * Skills 服务单测：扫描、Frontmatter 解析与创建管理
 */
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs"
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

    const content = readSkillContent(created.skillFilePath, [tempWorkspace])
    assert.ok(content.includes("/test-cmd"))

    const scanned = listInstalledSkills({ workspacePath: tempWorkspace })
    const found = scanned.find((s) => s.name === "my-test-skill")
    assert.ok(found)
    assert.equal(found.description, "Test Skill Description")
    assert.equal(found.trigger, "/test-cmd")
    assert.equal(found.scope, "workspace")

    const deleted = deleteSkillPackage(created.directoryPath, [tempWorkspace])
    assert.ok(deleted)
    assert.ok(!existsSync(created.directoryPath))
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})

test("Skills 拒绝删除工作区根", () => {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "enjoy-skills-deny-"))
  try {
    assert.throws(() => deleteSkillPackage(tempWorkspace, [tempWorkspace]))
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})

test("Must3 · 非法名/缺描述 fail-closed 不落盘", () => {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "enjoy-skills-gate-"))
  try {
    assert.throws(
      () =>
        createSkillPackage({
          name: "Bad_Name",
          description: "ok",
          scope: "workspace",
          workspacePath: tempWorkspace
        }),
      /小写字母|连字符|不合规/
    )
    assert.throws(
      () =>
        createSkillPackage({
          name: "ok-skill",
          description: "",
          scope: "workspace",
          workspacePath: tempWorkspace
        }),
      /功能描述|不合规/
    )
    const root = join(tempWorkspace, ".agents", "skills")
    assert.ok(!existsSync(join(root, "Bad_Name")))
    assert.ok(!existsSync(join(root, "ok-skill")))
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})

test("Must1/4 · 存量不合规旁注不删；解析 allowed-tools 仅展示", () => {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "enjoy-skills-annot-"))
  try {
    const dir = join(tempWorkspace, ".agents", "skills", "Bad_Skill")
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: Bad_Skill
trigger: /bad
allowed-tools: Bash(git:*) Read
---
# Bad
`,
      "utf-8"
    )
    const scanned = listInstalledSkills({ workspacePath: tempWorkspace })
    const found = scanned.find((s) => s.name === "Bad_Skill")
    assert.ok(found)
    assert.ok((found.issues?.length ?? 0) > 0)
    assert.equal(found.allowedTools, "Bash(git:*) Read")
    assert.equal(found.trigger, "/bad")
    assert.ok(existsSync(dir), "不合规不得删盘")
  } finally {
    rmSync(tempWorkspace, { recursive: true, force: true })
  }
})
