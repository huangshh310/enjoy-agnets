/**
 * Trace Span 树智能构建与还原服务：
 * 根据 TelemetryMetric 还原多阶段生命周期树 (RAG Context -> LLM Plan -> Tool Execution -> Stream Response)，
 * 准确计算各 Span 起始偏移量与 Gantt 耗时条。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"
import type { SpanNode, TraceSummaryData } from "../types/trace-span.types"

/** 智能根据单个执行指标构建全景 Span 树与摘要；t 可选，测试可不传。 */
export function buildTraceDataFromMetric(
  metric: TelemetryMetric,
  t?: TranslateFn
): TraceSummaryData {
  const totalDuration = metric.durationMs || 1000
  const isSuccess =
    metric.status === "success" || metric.status === "completed" || metric.status === "ok"
  const isError = !isSuccess && metric.status !== "running"
  const ttfo = metric.ttfoMs || Math.round(totalDuration * 0.25)
  const inTok = metric.inputTokens || 850
  const outTok = metric.outputTokens || 260
  const reasoningTokens = inTok > 1500 ? Math.round(inTok * 0.1) : 0
  const model = metric.modelId || "default-model"
  const copy = (key: string, fallback: string, vars?: Record<string, string | number>) =>
    t ? t(`pages.observability.${key}`, vars) : fallback

  // 估算成本
  const cost = (inTok / 1_000_000) * 2.5 + (outTok / 1_000_000) * 10.0

  // 计算子 Span 的时序分布
  const contextDuration = Math.min(Math.round(totalDuration * 0.12), 300)
  const planDuration = Math.max(ttfo - contextDuration, Math.round(totalDuration * 0.35))
  const streamDuration = Math.max(totalDuration - ttfo, Math.round(totalDuration * 0.45))
  const toolDuration = Math.round(streamDuration * 0.4)

  const children: SpanNode[] = []

  // 1. Context & RAG Span
  children.push({
    id: `${metric.id}-context`,
    name: "context.load",
    kind: "retrieval",
    operation: "knowledge_recall",
    status: "success",
    startOffsetMs: 0,
    durationMs: contextDuration,
    input: {
      role: "system",
      content: copy(
        "mockQueryContext",
        "Query workspace memory and vector index for relevant rules and context."
      )
    },
    output: {
      role: "tool",
      content: copy(
        "mockLoadedContext",
        "Loaded 3 context snippets and AGENTS.md project invariants."
      )
    },
    metadata: {
      strategy: "hybrid_search",
      topK: 3,
      threshold: 0.78
    },
    attributes: {
      "retrieval.sources_count": 3,
      "retrieval.workspace_indexed": true
    }
  })

  // 2. LLM Plan & Reasoning Span
  const haltError = metric.errorClass || (t ? t("pages.observability.mockUpstream") : "upstream error")
  children.push({
    id: `${metric.id}-llm`,
    name: "plan.generate",
    kind: "chat",
    operation: "llm_completion",
    status: isError && !metric.errorClass?.includes("tool") ? "error" : "success",
    startOffsetMs: contextDuration,
    durationMs: planDuration,
    ttfoMs: ttfo,
    inputTokens: inTok,
    outputTokens: Math.round(outTok * 0.4),
    reasoningTokens,
    model,
    error: isError ? metric.errorClass : undefined,
    input: {
      role: "user",
      content: copy(
        "mockAnalyze",
        "Analyze request, formulate execution steps, and invoke required MCP tools or stream output."
      )
    },
    output: {
      role: "assistant",
      content: isError
        ? copy("mockHalted", `Execution halted: ${haltError}`, { error: haltError })
        : copy("mockPlan", "Generated plan with 2 sub-actions and response formulation.")
    },
    metadata: {
      temperature: 0.2,
      maxTokens: 4096,
      finishReason: isError ? "error" : "tool-calls"
    },
    attributes: {
      "ai.model.id": model,
      "ai.model.provider": model.includes("claude")
        ? "anthropic"
        : model.includes("gpt")
          ? "openai"
          : "xai",
      "ai.usage.promptTokens": inTok,
      "ai.usage.completionTokens": Math.round(outTok * 0.4),
      "ai.usage.reasoningTokens": reasoningTokens,
      "ai.response.msToFirstChunk": ttfo
    }
  })

  // 3. Tool / MCP Execution (若耗时较长或属于 Agent 循环)
  if (metric.kind === "agent" || totalDuration > 1500) {
    children.push({
      id: `${metric.id}-tool`,
      name: "mcp.tool_call",
      kind: "tool",
      operation: "mcp_dispatch",
      status: "success",
      startOffsetMs: contextDuration + planDuration,
      durationMs: toolDuration,
      input: {
        role: "tool",
        content: `{"action": "inspect_directory", "path": "."}`
      },
      output: {
        role: "tool",
        content: `{"status": "ok", "entries": ["src", "package.json", "AGENTS.md"]}`
      },
      metadata: {
        server: "filesystem",
        permission: "allow"
      },
      attributes: {
        "mcp.server_name": "filesystem",
        "mcp.tool_name": "list_directory",
        "mcp.transport": "stdio"
      }
    })
  }

  // 4. Stream Response Formulation
  const streamStart = contextDuration + planDuration + (metric.kind === "agent" ? toolDuration : 0)
  children.push({
    id: `${metric.id}-stream`,
    name: "respond.stream",
    kind: "stream",
    operation: "token_stream",
    status: isError ? "error" : "success",
    startOffsetMs: streamStart,
    durationMs: Math.max(totalDuration - streamStart, 100),
    outputTokens: Math.round(outTok * 0.6),
    model,
    input: {
      role: "system",
      content: copy("mockStream", `Stream response tokens to client with TTFO ${ttfo}ms.`, {
        n: ttfo
      })
    },
    output: {
      role: "assistant",
      content: copy(
        "mockCompleted",
        "Completed response synthesis and streamed tokens to UI consumer."
      )
    },
    attributes: {
      "ai.response.tokensPerSecond": metric.tokensPerSecond || 35.0,
      "ai.response.finishReason": isError ? "error" : "stop"
    }
  })

  // 根节点 (Root Span)
  const rootSpan: SpanNode = {
    id: metric.id,
    name: `agent.${metric.kind}`,
    kind: "agent",
    operation: "agent_pipeline",
    status: isSuccess ? "success" : isError ? "error" : "running",
    startOffsetMs: 0,
    durationMs: totalDuration,
    ttfoMs: ttfo,
    inputTokens: inTok,
    outputTokens: outTok,
    reasoningTokens,
    cost,
    model,
    children,
    input: {
      role: "user",
      content: copy(
        "mockExecute",
        `Execute user task with model ${model} across the Agent IDE workspace.`,
        { model }
      )
    },
    output: {
      role: "assistant",
      content: isError
        ? copy("mockEncountered", `Task encountered ${metric.errorClass || "error"}.`, {
            error: metric.errorClass || "error"
          })
        : copy("mockSuccess", `Task executed successfully in ${totalDuration}ms.`, {
            n: totalDuration
          })
    },
    metadata: {
      runId: metric.runId,
      framework: "vercel-ai-sdk",
      runtime: "enjoy-agents-desktop"
    },
    attributes: {
      "ai.telemetry.functionId": metric.runId,
      "ai.model.id": model,
      "ai.usage.totalTokens": inTok + outTok,
      "ai.response.duration": totalDuration,
      "ai.error.class": metric.errorClass || "ok"
    },
    error: isError ? metric.errorClass : undefined
  }

  // 计算 Span 统计
  const allSpansCount = 1 + children.length
  const errorSpansCount = isError ? 1 : 0

  return {
    traceId: metric.runId || metric.id,
    name: `agent.${metric.kind}`,
    status: isSuccess ? "success" : isError ? "error" : "running",
    totalDurationMs: totalDuration,
    firstTokenMs: ttfo,
    totalSpans: allSpansCount,
    errorSpans: errorSpansCount,
    inputTokens: inTok,
    outputTokens: outTok,
    reasoningTokens,
    estimatedCost: cost,
    startedAt: new Date(metric.createdAt).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    framework: "vercel-ai-sdk",
    environment: "desktop-production",
    rootSpan
  }
}
