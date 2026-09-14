import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { inspectPluginImportRoot } from "./import-plugin.ts"

test("普通技能目录可导入", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-plugin-skills-"))
  try {
    mkdirSync(join(root, "tdd"))
    writeFileSync(join(root, "tdd", "SKILL.md"), "---\nname: tdd\n---\n")
    const inspected = inspectPluginImportRoot(root)
    assert.equal(inspected.kind, "skills-dir")
    assert.equal(inspected.mcpServers.length, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("Agent Plugin 抽出 skills 与 mcp", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-plugin-ap-"))
  try {
    writeFileSync(join(root, "plugin.json"), JSON.stringify({ name: "hello", skills: "./skills" }))
    mkdirSync(join(root, "skills", "greet"), { recursive: true })
    writeFileSync(join(root, "skills", "greet", "SKILL.md"), "---\nname: greet\n---\n")
    writeFileSync(
      join(root, "mcp.json"),
      JSON.stringify({ mcpServers: { github: { command: "npx", args: ["-y", "x"] } } })
    )
    const inspected = inspectPluginImportRoot(root)
    assert.equal(inspected.kind, "portable")
    assert.ok(inspected.skillsRoot.endsWith("skills"))
    assert.equal(inspected.mcpServers[0]?.name, "github")
    assert.equal(inspected.mcpServers[0]?.command, "npx -y x")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("Cordis / hooks 无 skills+mcp 则拒绝", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-plugin-dsh-"))
  try {
    writeFileSync(join(root, "cordis.patch.yml"), "- insert: []\n")
    writeFileSync(join(root, "package.json"), JSON.stringify({ dsh: { bundle: { patch: "./cordis.patch.yml" } } }))
    const inspected = inspectPluginImportRoot(root)
    assert.equal(inspected.kind, "rejected")
    assert.equal(inspected.reason, "PLUGIN_NOT_PORTABLE")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
