/**
 * Playwright 验收：IPC 合约 + Hash 路由清单。
 * 完整 Electron 窗口流（真实 Provider 聊天）仍依赖本机 Key，不在 CI 假装已跑通。
 */
import { expect, test } from "@playwright/test"
import {
  AiGenerateInput,
  AssetsUploadInput,
  KnowledgeSearchInput,
  McpAppMessageInput,
  McpCallInput,
  McpOpenAppInput,
  McpUpsertInput,
  MoveWorkspacePathInput,
  ObservabilityReplayInput,
  WorkflowResumeInput,
  SessionRenameInput,
  WorkflowStartInput
} from "@enjoy-agents/ipc-contract"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const routerSource = readFileSync(join(process.cwd(), "src/renderer/src/router.tsx"), "utf8")

test("根路由有错误边界，崩溃回退走人话不摊英文堆栈", () => {
  const appSource = readFileSync(join(process.cwd(), "src/renderer/src/App.tsx"), "utf8")
  const copySource = readFileSync(
    join(process.cwd(), "src/renderer/src/components/layout/crash-fallback/crash-fallback-copy.ts"),
    "utf8"
  )
  expect(appSource.includes("RendererErrorBoundary")).toBeTruthy()
  expect(routerSource.includes("errorComponent")).toBeTruthy()
  expect(routerSource.includes("CrashFallbackHost")).toBeTruthy()
  expect(copySource.includes("这里出了点问题。")).toBeTruthy()
  expect(copySource.includes("重新加载")).toBeTruthy()
  expect(copySource.includes("Something went wrong!")).toBeFalsy()
})

test("Hash 路由包含 Knowledge / Workflows / Media / MCP / Skills / Observability", () => {
  for (const path of ["/knowledge", "/workflows", "/media", "/mcp", "/skills", "/observability"]) {
    expect(routerSource.includes(`path: "${path}"`)).toBeTruthy()
  }
})

test("settings/skills 重定向到工作模块，没有第二套技能页", () => {
  expect(routerSource.includes('params.section === "skills"')).toBeTruthy()
  expect(routerSource.includes('redirect({ to: "/skills" })')).toBeTruthy()
  expect(routerSource.includes("SkillFlowPage")).toBeFalsy()
})

test("AppShell 单壳：Studio 重定向，二级壳不再「返回应用」", () => {
  expect(routerSource.includes("AppShell")).toBeTruthy()
  expect(routerSource.includes('path: "/studio"')).toBeTruthy()
  expect(routerSource.includes('redirect({ to: "/" })')).toBeTruthy()
  const secondary = readFileSync(
    join(process.cwd(), "src/renderer/src/components/app-pages/secondary-page-shell.tsx"),
    "utf8"
  )
  expect(secondary.includes("backToApp")).toBeFalsy()
  expect(secondary.includes("useRegisterModuleNav")).toBeTruthy()
})

test("Composer 运行中可 Stop，并可附加 Context", () => {
  const composer = readFileSync(
    join(process.cwd(), "src/renderer/src/components/ai-chat/ai-chat-composer.tsx"),
    "utf8"
  )
  const send = readFileSync(
    join(process.cwd(), "src/renderer/src/components/ai-chat/composer/runtime-interact/composer-send-split.tsx"),
    "utf8"
  )
  expect(send.includes('t("chat.stop")')).toBeTruthy()
  expect(composer.includes("ComposerToolbar")).toBeFalsy()
  expect(composer.includes("onAttach")).toBeTruthy()
  const mentions = readFileSync(
    join(process.cwd(), "src/renderer/src/components/ai-chat/composer/mentions/composer-mention-list.tsx"),
    "utf8"
  )
  expect(mentions.includes("composer-mention-list")).toBeTruthy()
  expect(mentions.includes("mention-sheet")).toBeTruthy()
  const attach = readFileSync(
    join(process.cwd(), "src/renderer/src/components/ai-chat/composer/composer-attach-menu.tsx"),
    "utf8"
  )
  expect(attach.includes("openComposerMention")).toBeTruthy()
  expect(attach.includes("webSearch")).toBeFalsy()
})

test("MCP App iframe 强制 sandbox 且无 Node", () => {
  const frame = readFileSync(
    join(process.cwd(), "src/renderer/src/components/mcp/mcp-app-frame.tsx"),
    "utf8"
  )
  expect(frame.includes('sandbox="allow-scripts"')).toBeTruthy()
  expect(frame.includes("allow-same-origin")).toBeFalsy()
  expect(frame.includes("event.source !== frameRef.current?.contentWindow")).toBeTruthy()
  const page = readFileSync(join(process.cwd(), "src/renderer/src/components/mcp/mcp-page.tsx"), "utf8")
  expect(page.includes("mcp.openApp") || page.includes("openApp")).toBeTruthy()
})

test("刷新恢复 / 结构化 / 审批 / DAG / 知识增量入口都在源码里", () => {
  const hydrate = readFileSync(join(process.cwd(), "src/renderer/src/hooks/hydrate-thread.ts"), "utf8")
  const extras = readFileSync(join(process.cwd(), "src/renderer/src/hooks/extras-from-parts.ts"), "utf8")
  const dag = readFileSync(
    join(process.cwd(), "src/renderer/src/components/workflows/workflow-dag.tsx"),
    "utf8"
  )
  const knowledge = readFileSync(
    join(process.cwd(), "src/renderer/src/components/knowledge/knowledge-page.tsx"),
    "utf8"
  )
  const prune = readFileSync(
    join(process.cwd(), "../../packages/agent-core/src/generation/prune.ts"),
    "utf8"
  )
  const structuredStream = readFileSync(
    join(process.cwd(), "../../packages/agent-core/src/generation/structured-stream.ts"),
    "utf8"
  )
  const subagent = readFileSync(
    join(process.cwd(), "../../packages/agent-core/src/agents/subagent-approval.ts"),
    "utf8"
  )
  expect(hydrate.includes("message_parts") || hydrate.includes("parts")).toBeTruthy()
  expect(hydrate.includes("parseAssistantPayload") || extras.includes("structured")).toBeTruthy()
  expect(extras.includes("structured") || extras.includes("sources")).toBeTruthy()
  expect(dag.includes("data-testid=\"workflow-dag\"")).toBeTruthy()
  expect(knowledge.includes("onRebuildIndex")).toBeTruthy()
  expect(knowledge.includes("KnowledgeIndexDrawer")).toBeTruthy()
  expect(prune.includes("clipHistory") || prune.includes("pruneModelMessages")).toBeTruthy()
  expect(structuredStream.includes("streamStructuredPartials")).toBeTruthy()
  expect(subagent.includes("waitForApproval")).toBeTruthy()
  const stop = readFileSync(
    join(process.cwd(), "../../packages/agent-core/src/policies/stop.ts"),
    "utf8"
  )
  expect(stop.includes("stepCountIs")).toBeTruthy()
  expect(stop.includes("hasToolCall")).toBeTruthy()
  expect(stop.includes("isLoopFinished")).toBeTruthy()
  const sandbox = readFileSync(
    join(process.cwd(), "src/renderer/src/components/settings/sandbox-settings.tsx"),
    "utf8"
  )
  expect(sandbox.includes("agentTimeoutMs")).toBeTruthy()
  expect(sandbox.includes("toolTimeoutMs")).toBeTruthy()
  expect(sandbox.includes("stepTimeoutMs")).toBeTruthy()
  const resume = readFileSync(join(process.cwd(), "src/main/services/ai-generation.ts"), "utf8")
  expect(resume.includes("parseGenerationCheckpoint")).toBeTruthy()
  expect(resume.includes("resumeAgentRun")).toBeTruthy()
  const catalog = readFileSync(
    join(process.cwd(), "../../packages/agent-harness/src/catalog.ts"),
    "utf8"
  )
  expect(catalog.includes('"codex"')).toBeTruthy()
  expect(catalog.includes('"pi"')).toBeTruthy()
  expect(catalog.includes('"opencode"')).toBeTruthy()
  const hmac = readFileSync(join(process.cwd(), "src/main/services/approval-hmac.ts"), "utf8")
  expect(hmac.includes("verifyApproval")).toBeTruthy()
})

test("kind=translation 是合法 GenerationKind", () => {
  expect(
    AiGenerateInput.safeParse({
      kind: "translation",
      sessionId: "s",
      modelId: "whisper-1",
      attachments: ["asset_1"]
    }).success
  ).toBe(true)
})

test("kind=agent 必须带 workspaceId", () => {
  expect(AiGenerateInput.safeParse({ kind: "agent", sessionId: "s", modelId: "m" }).success).toBe(false)
  expect(
    AiGenerateInput.safeParse({ kind: "agent", sessionId: "s", workspaceId: "w", modelId: "m" }).success
  ).toBe(true)
})

test("新 IPC 入参拒绝未知字段", () => {
  expect(AiGenerateInput.safeParse({ kind: "text", sessionId: "s", modelId: "m", extra: 1 }).success).toBe(
    false
  )
  expect(AssetsUploadInput.safeParse({ id: "a", extra: 1 }).success).toBe(false)
  expect(KnowledgeSearchInput.safeParse({ workspaceId: "w", query: "q", extra: 1 }).success).toBe(false)
  expect(WorkflowResumeInput.safeParse({ runId: "r", extra: 1 }).success).toBe(false)
  expect(WorkflowStartInput.safeParse({ sessionId: "s", extra: 1 }).success).toBe(false)
  expect(SessionRenameInput.safeParse({ sessionId: "s", title: "t", extra: 1 }).success).toBe(false)
  expect(McpUpsertInput.safeParse({ name: "s", transport: "stdio", extra: 1 }).success).toBe(false)
  expect(McpCallInput.safeParse({ id: "s", name: "t", extra: 1 }).success).toBe(false)
  expect(McpOpenAppInput.safeParse({ id: "s", extra: 1 }).success).toBe(false)
  expect(McpAppMessageInput.safeParse({ id: "s", message: {}, extra: 1 }).success).toBe(false)
  expect(ObservabilityReplayInput.safeParse({ extra: 1 }).success).toBe(false)
  expect(
    MoveWorkspacePathInput.safeParse({
      workspaceId: "w",
      from: "a.ts",
      toDir: "lib",
      extra: 1
    }).success
  ).toBe(false)
})
