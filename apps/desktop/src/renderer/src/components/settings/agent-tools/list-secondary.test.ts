/**
 * 助手列次行：短路径、无版本占位、未找到安装提示。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { formatListSecondary, shortBinPath, shortVersion } from "./list-secondary.ts"

const copy: Record<string, string> = {
  "settings.agentTools.listEnjoyLine": "本地核心 · 内置",
  "settings.agentTools.listHintNpm": "npm 全局可装",
  "settings.agentTools.listHintBrew": "brew 可装",
  "settings.agentTools.listHintCopy": "仅复制安装命令",
  "settings.agentTools.listHintPlanned": "规划中"
}

function t(key: string): string {
  return copy[key] ?? key
}

test("短路径只留 bin/name，不回绝对路径", () => {
  assert.equal(shortBinPath("/opt/homebrew/bin/claude"), "bin/claude")
  assert.equal(shortBinPath("/Users/me/.grok/bin/grok"), "bin/grok")
  assert.equal(shortBinPath("/usr/local/tools/my-acp", []), "tools/my-acp")
  assert.equal(shortBinPath(null, ["agent"]), "bin/agent")
  assert.ok(!shortBinPath("/opt/homebrew/bin/claude").startsWith("/"))
})

test("无版本用破折号", () => {
  assert.equal(shortVersion(null), "—")
  assert.equal(shortVersion("2.1.9 (Claude Code)"), "v2.1.9")
})

test("Enjoy / 已装 / 未找到次行", () => {
  assert.equal(
    formatListSecondary(
      {
        id: "enjoy-local",
        status: "ready",
        version: null,
        detectedPath: null,
        binaries: [],
        installKind: "copy",
        comingSoon: false,
        skillOnly: false
      },
      t
    ),
    "本地核心 · 内置"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "claude",
        status: "ready",
        version: null,
        detectedPath: "/usr/local/bin/claude",
        binaries: ["claude"],
        installKind: "npm",
        comingSoon: false,
        skillOnly: false
      },
      t
    ),
    "— · bin/claude"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "gemini",
        status: "missing",
        version: null,
        detectedPath: null,
        binaries: ["gemini"],
        installKind: "npm",
        comingSoon: false,
        skillOnly: false
      },
      t
    ),
    "— · npm 全局可装"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "cursor",
        status: "missing",
        version: null,
        detectedPath: null,
        binaries: ["agent"],
        installKind: "copy",
        comingSoon: false,
        skillOnly: false
      },
      t
    ),
    "— · 仅复制安装命令"
  )
})
