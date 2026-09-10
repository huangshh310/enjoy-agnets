import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AGENTS_MD_CHAIN_BYTE_BUDGET,
  formatAgentsMdChain,
  formatInstructionUpdate,
  instructionDirsForTouch,
  isAgentsChainFilePath,
  pickAgentsMdCandidate
} from "./agents-md-chain.ts"

test("链预算对齐 Codex project_doc_max_bytes", () => {
  assert.equal(AGENTS_MD_CHAIN_BYTE_BUDGET, 32_768)
})

test("每层 override 优先于 AGENTS.md", () => {
  assert.equal(pickAgentsMdCandidate(["CLAUDE.md", "AGENTS.md", "AGENTS.override.md"]), "AGENTS.override.md")
  assert.equal(pickAgentsMdCandidate(["GEMINI.md", "CLAUDE.md"]), "CLAUDE.md")
  assert.equal(pickAgentsMdCandidate(["README.md"]), undefined)
})

test("触达文件时祖先目录从根排到所在目录", () => {
  assert.deepEqual(instructionDirsForTouch("packages/foo/bar.ts"), [".", "packages", "packages/foo"])
  assert.deepEqual(instructionDirsForTouch("packages"), [".", "packages"])
  assert.deepEqual(instructionDirsForTouch("apps/AGENTS.md"), [".", "apps"])
  assert.deepEqual(instructionDirsForTouch("packages/foo.bar", "directory"), [
    ".",
    "packages",
    "packages/foo.bar"
  ])
  assert.deepEqual(instructionDirsForTouch("packages/foo.bar/a.ts", "file"), [
    ".",
    "packages",
    "packages/foo.bar"
  ])
  assert.deepEqual(instructionDirsForTouch("."), ["."])
})

test("链文件名识别", () => {
  assert.equal(isAgentsChainFilePath("/ws/AGENTS.md"), true)
  assert.equal(isAgentsChainFilePath("/ws/apps/CLAUDE.md"), true)
  assert.equal(isAgentsChainFilePath("/ws/.agents/rules/style.md"), false)
})

test("靠近 cwd 的层排在后面；超预算截断并注明", () => {
  const text = formatAgentsMdChain(
    [
      { relPath: "global:AGENTS.md", content: "global rules" },
      { relPath: "AGENTS.md", content: "root rules" }
    ],
    200
  )
  assert.ok(text.includes("global rules"))
  assert.ok(text.indexOf("global rules") < text.indexOf("root rules") || text.includes("truncated"))
  const huge = formatAgentsMdChain(
    [
      { relPath: "AGENTS.md", content: "R".repeat(400) },
      { relPath: "apps/AGENTS.md", content: "nested" }
    ],
    180
  )
  assert.ok(huge.includes("truncated"))
  assert.ok(huge.includes("nested"))
  assert.ok(!huge.includes("R".repeat(400)))
})

test("指令更新围栏给 prepareStep 用", () => {
  const text = formatInstructionUpdate([{ relPath: "apps/AGENTS.md", content: "app only" }])
  assert.ok(text.startsWith("[PROJECT INSTRUCTIONS UPDATE]"))
  assert.ok(text.includes("app only"))
})
