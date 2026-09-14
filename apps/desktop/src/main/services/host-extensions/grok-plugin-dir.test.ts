import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { stageGrokHostPlugin, stageGrokHostPluginDirs } from "./grok-plugin-dir.ts"

test("空技能目录不产出 plugin-dir", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-grok-plugin-"))
  assert.equal(stageGrokHostPlugin(join(root, "missing"), join(root, "plugin")), undefined)
})

test("有技能包时写出 plugin.json 并链到 skills", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-grok-plugin-"))
  const skills = join(root, "skills")
  mkdirSync(join(skills, "tdd"), { recursive: true })
  writeFileSync(join(skills, "tdd", "SKILL.md"), "# tdd\n")
  const plugin = stageGrokHostPlugin(skills, join(root, "plugin"))
  assert.ok(plugin)
  const manifest = JSON.parse(readFileSync(join(plugin!, "plugin.json"), "utf8")) as { name: string }
  assert.equal(manifest.name, "enjoy-host-skills")
  assert.equal(realpathSync(join(plugin!, "skills")), realpathSync(skills))
  assert.equal("hooks" in manifest, false)
})

test("stageGrokHostPluginDirs 收集全局与工作区", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-home-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-ws-"))
  mkdirSync(join(home, ".enjoy-agents", "skills", "review"), { recursive: true })
  mkdirSync(join(workspace, ".agents", "skills", "tdd"), { recursive: true })
  const dirs = stageGrokHostPluginDirs({ home, workspaceRoot: workspace })
  assert.equal(dirs.length, 2)
  assert.ok(dirs[0]?.includes("grok-plugin"))
  assert.ok(dirs[1]?.includes("grok-plugin-ws"))
})
