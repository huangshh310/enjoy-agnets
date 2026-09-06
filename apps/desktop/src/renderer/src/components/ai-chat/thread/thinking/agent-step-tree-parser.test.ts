/**
 * Agent Step Tree 解析器测试：
 * 验证路径冗余去除、批量文件编辑聚合与单项结构化解析。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"
import { parseAgentStepNodes } from "./agent-step-tree-parser.ts"

const mockT: TranslateFn = (key: string, params?: Record<string, string | number>) => {
  if (key === "chat.batchFilesModified") return `已修改 ${String(params?.count ?? 0)} 个文件`
  if (key === "chat.batchFilesRead") return `已读取 ${String(params?.count ?? 0)} 个文件`
  if (key === "chat.batchCommandsRun") return `已执行 ${String(params?.count ?? 0)} 条命令`
  if (key === "chat.exploringProject") return "正在探索项目"
  if (key === "chat.exploredPages") return `已浏览 ${String(params?.count ?? 0)} 个页面`
  if (key === "chat.readName") return `已读取 ${String(params?.name ?? "")}`
  if (key === "chat.verbWrite") return "写入"
  if (key === "chat.verbEdit") return "编辑"
  if (key === "chat.verbRead") return "读取"
  if (key === "chat.verbFind") return "查找"
  if (key === "chat.verbRun") return "运行"
  if (key === "chat.searchingQuery") return `正在搜索 ${String(params?.query ?? "")}`
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

test("grep 的 pattern 不会被当成 bash 命令", () => {
  const nodes = parseAgentStepNodes("", [createTool("t1", "grep", { pattern: "foo" })], mockT)
  assert.equal(nodes[0]?.kind, "search")
})

test("bash 命令抽出可点域名胶囊", () => {
  const nodes = parseAgentStepNodes(
    "",
    [createTool("t1", "bash", { command: "curl -fsSL https://wttr.in/Shanghai" }, { exitCode: 0 })],
    mockT
  )
  assert.equal(nodes[0]?.kind, "command")
  assert.equal(nodes[0]?.domainPills?.[0]?.label, "wttr.in")
})

test("一次读取多个文件写入 exploredPages", () => {
  const nodes = parseAgentStepNodes(
    "",
    [createTool("t1", "read_file", { files: ["a.ts", "b.ts", "c.ts"] })],
    mockT
  )
  assert.equal(nodes[0]?.kind, "reading")
  assert.equal(nodes[0]?.exploredPages?.length, 3)
  assert.equal(nodes[0]?.exploredTitle, "已浏览 3 个页面")
})

test("思考按工具切口拆开，当前段落在工具后面", () => {
  const tools: ThreadToolCall[] = [
    { ...createTool("t1", "read_file", { path: "README.md" }), reasoningChars: 4 },
    { ...createTool("t2", "bash", { command: "ls" }, { exitCode: 0 }), reasoningChars: 8 }
  ]
  const nodes = parseAgentStepNodes("AAAABBBBCCCC", tools, mockT)
  assert.equal(nodes.map((node) => node.kind).join(","), "thinking,reading,thinking,command,thinking")
  assert.equal(nodes[0]?.rawText, "AAAA")
  assert.equal(nodes[2]?.rawText, "BBBB")
  assert.equal(nodes[4]?.rawText, "CCCC")
})
