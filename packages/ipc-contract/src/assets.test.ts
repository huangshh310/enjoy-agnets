import assert from "node:assert/strict"
import { test } from "node:test"
import { AssetsExportInput, AssetsImportInput, AssetsUploadInput } from "./assets.ts"
import { KnowledgeSearchInput } from "./knowledge.ts"
import { McpUpsertInput } from "./mcp.ts"
import { WorkflowResumeInput } from "./workflow.ts"

test("assets.import 拒绝超大 base64", () => {
  assert.equal(
    AssetsImportInput.safeParse({
      name: "big.bin",
      mediaType: "application/octet-stream",
      bytesBase64: "a".repeat(12_000_001)
    }).success,
    false
  )
})

test("assets.upload 拒绝未知字段", () => {
  assert.equal(AssetsUploadInput.safeParse({ id: "a1", extra: true }).success, false)
  assert.equal(AssetsUploadInput.safeParse({ id: "a1", purpose: "file" }).success, true)
})

test("assets.export / knowledge / workflow / mcp 拒绝未知字段", () => {
  assert.equal(
    AssetsExportInput.safeParse({
      id: "a1",
      workspaceId: "w1",
      relativePath: "out.bin",
      extra: 1
    }).success,
    false
  )
  assert.equal(KnowledgeSearchInput.safeParse({ workspaceId: "w", query: "q", extra: 1 }).success, false)
  assert.equal(WorkflowResumeInput.safeParse({ runId: "r", extra: 1 }).success, false)
  assert.equal(
    McpUpsertInput.safeParse({ name: "s", transport: "stdio", extra: 1 }).success,
    false
  )
})
