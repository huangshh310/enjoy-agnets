/**
 * Agent Step Tree 解析器测试：
 * 验证路径冗余去除、批量文件编辑聚合与单项结构化解析。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { TranslateFn } from "@renderer/i18n"
import { parseAgentStepNodes } from "./agent-step-tree-parser.ts"

const mockT: TranslateFn = (key: string, params?: Record<string, unknown>) => {
  if (key === "chat.batchFilesModified") return `已修改 ${String(params?.count ?? 0)} 个文件`
  if (key === "chat.verbWrite") return "写入"
  if (key === "chat.verbEdit") return "编辑"
  return key
}

function createTool(id: string, name: string, args: Record<string, unknown>, result: Record<string, unknown> = {}): ThreadToolCall {
  return {
    id,
    name,
    args,
    result,
    state: "output-available"
  }
}

test("单个 editing 节点去除副标题重复路径，提取 fileName 与 fileDir", () => {
  const tools: ThreadToolCall[] = [
    createTool("t1", "write_file", { path: "login-rs/src/error.rs" }, { additions: 41, deletions: 0 })
  ]

  const nodes = parseAgentStepNodes("", tools, mockT)
  assert.equal(nodes.length, 1)
  const node = nodes[0]
  assert.equal(node.kind, "editing")
  assert.equal(node.title, "写入 error.rs")
  assert.equal(node.fileName, "error.rs")
  assert.equal(node.fileDir, "login-rs/src/")
  assert.equal(node.detail, undefined) // 彻底杜绝副标题重复
  assert.equal(node.additions, 41)
})

test("连续 3 个及以上文件写入自动聚合成单一批量节点", () => {
  const tools: ThreadToolCall[] = [
    createTool("t1", "write_file", { path: "login-rs/Cargo.toml" }, { additions: 15, deletions: 0 }),
    createTool("t2", "write_file", { path: "login-rs/src/error.rs" }, { additions: 41, deletions: 0 }),
    createTool("t3", "write_file", { path: "login-rs/src/account.rs" }, { additions: 128, deletions: 0 }),
    createTool("t4", "write_file", { path: "login-rs/src/main.rs" }, { additions: 113, deletions: 0 })
  ]

  const nodes = parseAgentStepNodes("", tools, mockT)
  assert.equal(nodes.length, 1)
  const batchNode = nodes[0]
  assert.equal(batchNode.isBatch, true)
  assert.equal(batchNode.title, "已修改 4 个文件")
  assert.equal(batchNode.additions, 15 + 41 + 128 + 113)
  assert.equal(batchNode.batchItems?.length, 4)
  assert.equal(batchNode.batchItems?.[0]?.fileName, "Cargo.toml")
  assert.equal(batchNode.batchItems?.[1]?.fileName, "error.rs")
})

test("少于 3 个连续编辑保持独立节点不合并", () => {
  const tools: ThreadToolCall[] = [
    createTool("t1", "write_file", { path: "login-rs/Cargo.toml" }, { additions: 15 }),
    createTool("t2", "write_file", { path: "login-rs/src/main.rs" }, { additions: 20 })
  ]

  const nodes = parseAgentStepNodes("", tools, mockT)
  assert.equal(nodes.length, 2)
  assert.equal(nodes[0].isBatch, undefined)
  assert.equal(nodes[1].isBatch, undefined)
})

test("bash 终端命令精准归位为 command 节点且不被批量编辑合并", () => {
  const tools: ThreadToolCall[] = [
    createTool("t1", "bash", { command: "curl -fsSL https://wttr.in/Shanghai" }, { exitCode: 2, stderr: "curl: option unknown" }),
    createTool("t2", "write_file", { path: "weather.json" }, { additions: 10 }),
    createTool("t3", "bash", { command: "python3 --version" }, { exitCode: 0, stdout: "Python 3.11" })
  ]

  const nodes = parseAgentStepNodes("", tools, mockT)
  assert.equal(nodes.length, 3)
  assert.equal(nodes[0].kind, "command")
  assert.equal(nodes[0].title, "$ curl -fsSL https://wttr.in/Shanghai")
  assert.equal(nodes[0].exitCode, 2)
  assert.equal(nodes[0].status, "error")

  assert.equal(nodes[1].kind, "editing")
  assert.equal(nodes[1].fileName, "weather.json")

  assert.equal(nodes[2].kind, "command")
  assert.equal(nodes[2].title, "$ python3 --version")
  assert.equal(nodes[2].exitCode, 0)
  assert.equal(nodes[2].status, "completed")
})
