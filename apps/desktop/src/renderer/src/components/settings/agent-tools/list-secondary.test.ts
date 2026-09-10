/**
 * 助手列次行：只拼版本 · 短路径，未找到两边缺则 — · —。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { formatListSecondary, shortBinPath, shortVersion } from "./list-secondary.ts"

function t(key: string): string {
  return key === "settings.agentTools.listEnjoyBuiltin" ? "内置" : key
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
  const missing = formatListSecondary(
    { id: "cursor", status: "missing", version: null, detectedPath: null, binaries: ["agent"] },
    t
  )
  const samples = [
    missing,
    formatListSecondary(
      { id: "claude", status: "ready", version: "v2.1.9", detectedPath: "/usr/local/bin/claude", binaries: ["claude"] },
      t
    ),
    formatListSecondary(
      { id: "grok", status: "ready", version: null, detectedPath: "/home/me/.grok/bin/grok", binaries: ["grok"] },
      t
    )
  ]
  for (const line of samples) {
    assert.ok(!line.includes("npm"))
    assert.ok(!line.includes("体检"))
    assert.ok(!line.includes("体检正常"))
    assert.ok(!line.includes("doctor"))
    assert.ok(!line.includes("官方仍保留"))
    assert.match(line, /^[^·]+ · [^·]+$/)
  }
})
