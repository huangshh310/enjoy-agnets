/**
 * Claude 累加每轮 usage；Codex 每个文件只取最后一次累计。
 */
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { collectCliTranscriptUsage } from "./collect.ts"
import { parseClaudeTranscript } from "./parse-claude.ts"
import { parseCodexTranscript } from "./parse-codex.ts"
import { projectLabelFromCwd } from "./parse-usage.ts"

test("cwd 只留最后一段，不把绝对路径送出去", () => {
  assert.equal(projectLabelFromCwd("/Users/huangshh/workspace/proj/enjoy-agnets"), "enjoy-agnets")
  assert.equal(projectLabelFromCwd(""), undefined)
})

test("Claude assistant usage 按行累加", () => {
  const text = [
    JSON.stringify({
      type: "assistant",
      timestamp: "2026-09-08T10:00:00.000Z",
      cwd: "/tmp/demo",
      message: {
        model: "claude-opus-4-6",
        usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 2 }
      }
    }),
    JSON.stringify({
      type: "assistant",
      timestamp: "2026-09-08T11:00:00.000Z",
      message: { usage: { input_tokens: 3, output_tokens: 1 } }
    })
  ].join("\n")
  const usage = parseClaudeTranscript(text)
  assert.equal(usage.inputTokens, 13)
  assert.equal(usage.outputTokens, 5)
  assert.equal(usage.cacheTokens, 2)
  assert.equal(usage.model, "claude-opus-4-6")
  assert.equal(usage.day, "2026-09-08")
  assert.equal(usage.project, "demo")
})

test("Codex 多次 token_count 只留最后累计", () => {
  const text = [
    JSON.stringify({
      timestamp: "2026-09-08T06:32:11.040Z",
      type: "session_meta",
      payload: { cwd: "/Users/x/demo", model: "gpt-5" }
    }),
    JSON.stringify({
      timestamp: "2026-09-08T06:32:11.050Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } }
      }
    }),
    JSON.stringify({
      timestamp: "2026-09-08T06:32:12.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 40,
            cached_input_tokens: 5,
            output_tokens: 8,
            total_tokens: 53
          }
        }
      }
    })
  ].join("\n")
  const usage = parseCodexTranscript(text)
  assert.equal(usage.inputTokens, 40)
  assert.equal(usage.outputTokens, 8)
  assert.equal(usage.cacheTokens, 5)
  assert.equal(usage.totalTokens, 53)
  assert.equal(usage.project, "demo")
  assert.equal(usage.model, "gpt-5")
})

test("扫描家目录聚合并不回传绝对路径", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-"))
  mkdirSync(join(home, ".claude", "projects", "demo"), { recursive: true })
  mkdirSync(join(home, ".codex", "archived_sessions"), { recursive: true })
  writeFileSync(
    join(home, ".claude", "projects", "demo", "a.jsonl"),
    `${JSON.stringify({
      type: "assistant",
      timestamp: "2026-09-01T00:00:00Z",
      cwd: "/secret/repo-a",
      message: { model: "claude-opus-4-6", usage: { input_tokens: 7, output_tokens: 1 } }
    })}\n`
  )
  writeFileSync(
    join(home, ".codex", "archived_sessions", "b.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-09-02T00:00:00Z",
      type: "session_meta",
      payload: { cwd: "/secret/repo-b", model: "gpt-5" }
    })}\n${JSON.stringify({
      timestamp: "2026-09-02T00:00:01Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } }
      }
    })}\n`
  )
  const report = collectCliTranscriptUsage(home, 1)
  assert.equal(report.scannedAt, 1)
  assert.deepEqual(
    report.sources.map((item) => item.id),
    ["claude", "codex"]
  )
  assert.equal(report.sources.every((item) => item.found), true)
  const blob = JSON.stringify(report)
  assert.equal(blob.includes("/secret/"), false)
  assert.ok(report.projects.some((item) => item.key === "repo-a"))
  assert.ok(report.projects.some((item) => item.key === "repo-b"))
  const claudeDay = report.days.find((item) => item.key === "2026-09-01")
  assert.equal(claudeDay?.inputTokens, 7)
})

test("没有目录时 found=false，不画假数字", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-empty-"))
  const report = collectCliTranscriptUsage(home, 2)
  assert.equal(report.sources.every((item) => item.found === false), true)
  assert.equal(report.days.length, 0)
})
