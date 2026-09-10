import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { AGENTS_MD_CHAIN_HEADER } from "@enjoy-agents/ipc-contract/agents-md-chain"
import {
  discoverAgentsMdChain,
  formatWorkspaceAgentsMd,
  readWorkspaceDirLayer
} from "./agents-md-discover.ts"

test("根 AGENTS.md 进链；子目录要 cwd 才进", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-agents-md-"))
  writeFileSync(join(root, "AGENTS.md"), "root contract")
  mkdirSync(join(root, "apps"))
  writeFileSync(join(root, "apps", "AGENTS.md"), "apps only")
  const atRoot = discoverAgentsMdChain({ workspaceRoot: root, cwdRel: ".", home: join(root, "no-home") })
  assert.equal(atRoot.some((layer) => layer.content.includes("root contract")), true)
  assert.equal(atRoot.some((layer) => layer.content.includes("apps only")), false)
  const nested = discoverAgentsMdChain({
    workspaceRoot: root,
    cwdRel: "apps/page.ts",
    home: join(root, "no-home")
  })
  assert.equal(nested.some((layer) => layer.content.includes("apps only")), true)
})

test("同层 AGENTS.override.md 取代 AGENTS.md", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-agents-ov-"))
  writeFileSync(join(root, "AGENTS.md"), "base")
  writeFileSync(join(root, "AGENTS.override.md"), "override wins")
  const layer = readWorkspaceDirLayer(root, ".")
  assert.equal(layer?.content.trim(), "override wins")
})

test("逃出工作区的目录不进链", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-agents-jail-"))
  writeFileSync(join(root, "AGENTS.md"), "root")
  assert.equal(readWorkspaceDirLayer(root, ".."), undefined)
})

test("没有 AGENTS.md 时回落 CLAUDE.md", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-agents-cl-"))
  writeFileSync(join(root, "CLAUDE.md"), "claude fallback")
  const layer = readWorkspaceDirLayer(root, ".")
  assert.equal(layer?.relPath, "CLAUDE.md")
})

test("全局 ~/.enjoy-agents 排在工作区根前面", () => {
  const root = mkdtempSync(join(tmpdir(), "enjoy-agents-g-"))
  const home = join(root, "home")
  mkdirSync(join(home, ".enjoy-agents"), { recursive: true })
  writeFileSync(join(home, ".enjoy-agents", "AGENTS.md"), "global contract")
  writeFileSync(join(root, "AGENTS.md"), "root contract")
  const layers = discoverAgentsMdChain({ workspaceRoot: root, cwdRel: ".", home })
  assert.equal(layers[0]?.relPath, "global:AGENTS.md")
  assert.equal(layers[1]?.content.includes("root contract"), true)
  const text = formatWorkspaceAgentsMd(root, ".", home)
  assert.ok(text.startsWith(AGENTS_MD_CHAIN_HEADER))
  assert.ok(text.indexOf("global contract") < text.indexOf("root contract"))
})
