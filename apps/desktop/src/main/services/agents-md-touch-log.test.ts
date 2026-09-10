import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { createInstructionTouchLog } from "./agents-md-touch-log.ts"

test("根已在基线时，读子文件才注入子目录 AGENTS.md", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-touch-"))
  writeFileSync(join(root, "AGENTS.md"), "root")
  mkdirSync(join(root, "apps"))
  writeFileSync(join(root, "apps", "AGENTS.md"), "nested apps")
  const log = createInstructionTouchLog({ workspaceRoot: root, initialDirRels: ["."] })
  log.note("README.md")
  assert.equal(log.takeNew().length, 0)
  log.note("apps/page.tsx")
  const injected = log.takeNew()
  assert.equal(injected.length, 1)
  assert.ok(String(injected[0]?.content).includes("nested apps"))
  assert.ok(String(injected[0]?.content).startsWith("[PROJECT INSTRUCTIONS UPDATE]"))
  assert.equal(log.takeNew().length, 0)
})

test("list_dir 子目录也算触达，根已在基线则只注入该层", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-touch-dir-"))
  writeFileSync(join(root, "AGENTS.md"), "root")
  mkdirSync(join(root, "apps"))
  writeFileSync(join(root, "apps", "AGENTS.md"), "apps layer")
  const log = createInstructionTouchLog({ workspaceRoot: root, initialDirRels: ["."] })
  log.note("apps", "directory")
  const injected = log.takeNew()
  assert.equal(injected.length, 1)
  assert.ok(String(injected[0]?.content).includes("apps layer"))
  assert.ok(!String(injected[0]?.content).includes("root"))
})
