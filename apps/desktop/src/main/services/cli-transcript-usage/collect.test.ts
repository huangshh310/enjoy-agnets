/**
 * Claude 累加每轮 usage；Codex 每个文件只取最后一次累计；catalog 四态。
 */
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { catalogIds } from "./catalog.ts"
import { collectCliTranscriptUsage } from "./collect.ts"
import { parseClaudeTranscript } from "./parsers/parse-claude.ts"
import { parseCodexTranscript } from "./parsers/parse-codex.ts"
import { projectLabelFromCwd } from "./parsers/parse-usage.ts"

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
    [...catalogIds()]
  )
  const claude = report.sources.find((item) => item.id === "claude")
  const codex = report.sources.find((item) => item.id === "codex")
  const grok = report.sources.find((item) => item.id === "grok")
  assert.equal(claude?.status, "has-usage")
  assert.equal(codex?.status, "has-usage")
  assert.equal(grok?.status, "directory-missing")
  assert.equal(claude?.fileCount, 1)
  assert.equal(claude?.inputTokens, 7)
  const blob = JSON.stringify(report)
  assert.equal(blob.includes("/secret/"), false)
  assert.ok(report.projects.some((item) => item.key === "repo-a"))
  assert.ok(report.projects.some((item) => item.key === "repo-b"))
  const claudeDay = report.days.find((item) => item.key === "2026-09-01")
  assert.equal(claudeDay?.inputTokens, 7)
})

test("空 tmp home：导轨 12 源都是 directory-missing，不再 unsupported", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-empty-"))
  const report = collectCliTranscriptUsage(home, 2)
  assert.deepEqual(
    report.sources.map((item) => item.id),
    [...catalogIds()]
  )
  for (const source of report.sources) {
    assert.equal(source.status, "directory-missing")
    assert.equal(source.fileCount, 0)
    assert.equal(source.sessionCount, 0)
  }
  assert.equal(report.days.length, 0)
})

test("Codex custom provider 聚合为 custom-upstream，blob 不含 model_provider", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-custom-"))
  mkdirSync(join(home, ".codex", "sessions"), { recursive: true })
  writeFileSync(
    join(home, ".codex", "sessions", "rollout.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-09-10T21:22:46.000Z",
      type: "session_meta",
      payload: { cwd: "/secret/enjoy-agnets", model: "", model_provider: "custom" }
    })}\n${JSON.stringify({
      timestamp: "2026-09-10T21:22:47.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 100 } }
      }
    })}\n`
  )
  const report = collectCliTranscriptUsage(home, 4)
  const blob = JSON.stringify(report)
  assert.equal(blob.includes("model_provider"), false)
  assert.equal(blob.includes(':"custom"'), false)
  assert.ok(report.models.some((item) => item.key === "custom-upstream"))
  assert.equal(report.models.find((item) => item.key === "custom-upstream")?.inputTokens, 0)
})

test("Grok usage.json 入表，嵌套 subagents 不计 fileCount", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-grok-"))
  const encoded = encodeURIComponent("/Users/demo/enjoy-agnets")
  const sessionDir = join(home, ".grok", "sessions", encoded, "sid-1")
  mkdirSync(sessionDir, { recursive: true })
  mkdirSync(join(home, ".grok", "sessions", encoded, "sid-1", "subagents", "child"), { recursive: true })
  writeFileSync(
    join(sessionDir, "usage.json"),
    JSON.stringify({
      updatedAt: "2026-09-08T10:00:00Z",
      session: {
        inputTokens: 7210,
        outputTokens: 1893,
        cachedReadTokens: 41000,
        totalTokens: 50103,
        primaryModelId: "grok-4.6-build",
        costUsdTicks: 358570800
      },
      turns: [{ inputTokens: 1, outputTokens: 1, totalTokens: 2 }]
    })
  )
  writeFileSync(
    join(home, ".grok", "sessions", encoded, "sid-1", "subagents", "child", "usage.json"),
    JSON.stringify({
      session: { inputTokens: 99, outputTokens: 1, totalTokens: 100, primaryModelId: "child" }
    })
  )
  const report = collectCliTranscriptUsage(home, 5)
  const grok = report.sources.find((item) => item.id === "grok")
  assert.equal(grok?.status, "has-usage")
  assert.equal(grok?.fileCount, 1)
  assert.equal(grok?.sessionCount, 1)
  assert.equal(grok?.totalTokens, 50103)
  assert.equal(grok?.costUsdTicks, 358570800)
  const blob = JSON.stringify(report)
  assert.equal(blob.includes("/Users/"), false)
  assert.equal(blob.includes("%2FUsers"), false)
  assert.ok(report.projects.some((item) => item.key === "enjoy-agnets"))
  assert.equal(report.models.some((item) => item.key === "child"), false)
})

test("OMP camelCase usage 入表，Cursor 无用量字段是 scanned-empty", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-omp-"))
  mkdirSync(join(home, ".omp", "agent", "sessions", "demo"), { recursive: true })
  mkdirSync(join(home, ".cursor", "projects", "demo", "agent-transcripts"), { recursive: true })
  writeFileSync(
    join(home, ".omp", "agent", "sessions", "demo", "a.jsonl"),
    `${JSON.stringify({
      type: "session",
      timestamp: "2026-09-06T06:37:01.840Z",
      cwd: "/secret/enjoy-agnets"
    })}\n${JSON.stringify({
      type: "message",
      timestamp: "2026-09-06T07:04:06.924Z",
      message: { usage: { input: 10, output: 2, cacheRead: 4, totalTokens: 16 } }
    })}\n`
  )
  writeFileSync(
    join(home, ".cursor", "projects", "demo", "agent-transcripts", "t.jsonl"),
    `${JSON.stringify({ role: "user", message: { content: "hi" } })}\n`
  )
  const report = collectCliTranscriptUsage(home, 6)
  const omp = report.sources.find((item) => item.id === "omp")
  const cursor = report.sources.find((item) => item.id === "cursor")
  assert.equal(omp?.status, "has-usage")
  assert.equal(omp?.totalTokens, 16)
  assert.equal(omp?.cacheTokens, 4)
  assert.equal(cursor?.status, "scanned-empty")
  assert.ok((cursor?.fileCount ?? 0) > 0)
  assert.equal(JSON.stringify(report).includes("/secret/"), false)
})

test("有 jsonl 但全 0 usage：scanned-empty 且 fileCount > 0", () => {
  const home = mkdtempSync(join(tmpdir(), "enjoy-cli-usage-zero-"))
  mkdirSync(join(home, ".claude", "projects", "demo"), { recursive: true })
  writeFileSync(join(home, ".claude", "projects", "demo", "empty.jsonl"), "{}\n")
  const report = collectCliTranscriptUsage(home, 3)
  const claude = report.sources.find((item) => item.id === "claude")
  assert.equal(claude?.status, "scanned-empty")
  assert.ok((claude?.fileCount ?? 0) > 0)
  assert.equal(claude?.sessionCount, 0)
})
