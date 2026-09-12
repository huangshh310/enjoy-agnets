/**
 * 助手列次行：只拼版本 · 短路径，未找到两边缺则 — · —。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { formatListSecondary, shortBinPath, shortVersion } from "./list-secondary.ts"

function t(key: string, vars?: Record<string, string | number>): string {
  if (key === "settings.agentTools.listEnjoyBuiltin") return "内置"
  if (key === "settings.agentTools.listOutdatedSecondary") {
    return `需更新 · ${vars?.current ?? "—"}（要 ≥${vars?.required ?? "—"}）`
  }
  return key
}

test("短路径只留 bin/name，不回绝对路径", () => {
  assert.equal(shortBinPath("/opt/homebrew/bin/claude"), "bin/claude")
  assert.equal(shortBinPath("/Users/me/.grok/bin/grok"), "bin/grok")
  assert.equal(shortBinPath("/usr/local/tools/my-acp", []), "tools/my-acp")
  assert.ok(!shortBinPath("/opt/homebrew/bin/claude").startsWith("/"))
})

test("无版本用破折号", () => {
  assert.equal(shortVersion(null), "—")
  assert.equal(shortVersion("2.1.9 (Claude Code)"), "v2.1.9")
})

test("Enjoy / 已装 / 未找到次行只含版本与短路径", () => {
  assert.equal(
    formatListSecondary(
      {
        id: "enjoy-local",
        status: "ready",
        version: null,
        detectedPath: null,
        binaries: []
      },
      t
    ),
    "— · 内置"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "claude",
        status: "ready",
        version: "v2.1.9",
        detectedPath: "/usr/local/bin/claude",
        binaries: ["claude"]
      },
      t
    ),
    "v2.1.9 · bin/claude"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "grok",
        status: "ready",
        version: null,
        detectedPath: "/home/me/.grok/bin/grok",
        binaries: ["grok"]
      },
      t
    ),
    "— · bin/grok"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "gemini",
        status: "missing",
        version: null,
        detectedPath: null,
        binaries: ["gemini"]
      },
      t
    ),
    "— · —"
  )
  const lines = [
    formatListSecondary(
      { id: "cursor", status: "missing", version: null, detectedPath: null, binaries: ["agent"] },
      t
    ),
    formatListSecondary(
      { id: "claude", status: "ready", version: "v2.1.9", detectedPath: "/usr/local/bin/claude", binaries: ["claude"] },
      t
    ),
    formatListSecondary(
      { id: "grok", status: "ready", version: null, detectedPath: "/home/me/.grok/bin/grok", binaries: ["grok"] },
      t
    )
  ]
  for (const line of lines) {
    assert.ok(!line.includes("npm"))
    assert.ok(!line.includes("体检"))
    assert.ok(!line.includes("体检正常"))
    assert.ok(!line.includes("doctor"))
    assert.ok(!line.includes("官方仍保留"))
    assert.match(line, /^[^·]+ · [^·]+$/)
  }
})

test("过旧次行例外；升级后回到版本 · 路径", () => {
  assert.equal(
    formatListSecondary(
      {
        id: "cursor",
        status: "ready",
        version: "1.2",
        requiredVersion: "1.5",
        detectedPath: "/usr/local/bin/agent",
        binaries: ["agent"]
      },
      t
    ),
    "需更新 · v1.2（要 ≥1.5）"
  )
  assert.equal(
    formatListSecondary(
      {
        id: "cursor",
        status: "ready",
        version: "1.5",
        requiredVersion: "1.5",
        detectedPath: "/usr/local/bin/agent",
        binaries: ["agent"]
      },
      t
    ),
    "v1.5 · bin/agent"
  )
})
