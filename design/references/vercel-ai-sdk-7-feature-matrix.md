# Vercel AI SDK 7 功能全表

> 位置：`design/references/vercel-ai-sdk-7-feature-matrix.md`。本仓落地用法见 [`../specs/agent-runtime.md`](../specs/agent-runtime.md)。  
> 整理日期：2026-08-31  
> 对应版本：**AI SDK 7.x（Latest）**  
> 安装：`npm i ai`  
> 官方文档：[https://ai-sdk.dev/docs/introduction](https://ai-sdk.dev/docs/introduction)

本表按「能不能用来做产品」整理，方便直接对照选型。  
标记说明：

- **稳定**：可作主路径
- **实验**：可作增值，接口可能变
- **看模型**：SDK 支持，但取决于所选 Provider / 模型

---

## 目录

1. [产品分层](#1-产品分层)
2. [生成类能力（Core）](#2-生成类能力core)
3. [工具 / Agent](#3-工具--agent)
4. [前端 UI](#4-前端-ui)
5. [生成式 UI / RSC](#5-生成式-ui--rsc)
6. [生产 / 工程能力](#6-生产--工程能力)
7. [官方 Provider 能力对照](#7-官方-provider-能力对照)
8. [框架与运行时](#8-框架与运行时)
9. [按产品类型选型](#9-按产品类型选型)
10. [推荐最小技术栈](#10-推荐最小技术栈)
11. [核心 API 速查](#11-核心-api-速查)
12. [官方链接](#12-官方链接)

---

## 1. 产品分层

| 层 | 包 / 入口 | 干什么 |
|---|---|---|
| **AI SDK Core** | `ai` | 调模型：文本、结构化输出、工具、Agent、多模态 |
| **AI SDK UI** | `@ai-sdk/react` 等 | 前端 hooks：聊天、补全、流式对象 |
| **AI SDK Harnesses** | `HarnessAgent` | 用统一接口跑 Claude Code、Codex、Pi 等现成 Agent |
| **AI SDK RSC** | 实验 | React Server Components 流式组件（生产更建议用 UI 层） |

换模型只改一行，不必重写业务代码。

```ts
import { generateText } from "ai";

const { text } = await generateText({
  model: "openai/gpt-5", // 或 "anthropic/claude-sonnet-4" / "xai/grok-4"
  prompt: "用一句话说清量子纠缠",
});
```

---

## 2. 生成类能力（Core）

| 功能 | API | 状态 | 适合做什么 |
|---|---|---|---|
| 文本生成 | `generateText` | 稳定 | 摘要、邮件、批量任务、后台自动化 |
| 文本流式 | `streamText` | 稳定 | 聊天打字机效果 |
| 结构化 JSON | `generateText` + `Output.object()` / `Output.array()` | 稳定 | 填表、抽取、分类、校验后入库 |
| 结构化流式 | `streamText` + `output` | 稳定 | 表单 / 卡片边生成边渲染 |
| 推理强度 | `reasoning` | 稳定（看模型） | 难推理、规划、多步思考 |
| 多步循环 | `stopWhen` / `prepareStep` | 稳定 | Agent 连续思考 + 调工具 |
| 图片理解 | 消息里塞 image / file | 稳定（看模型） | 识图、PDF、截图问答 |
| 生图 / 改图 | `generateImage` | 稳定 | 文生图、图生图 |
| 向量嵌入 | `embed` / `embedMany` | 稳定 | RAG、语义搜索、去重 |
| 向量相似度 | `cosineSimilarity` | 稳定 | 检索排序 |
| 重排序 | rerank | 稳定（看模型） | RAG 精排 |
| 语音合成 TTS | `generateSpeech` | 稳定 | 朗读、语音回复 |
| 语音转写 STT | `transcribe` | 稳定 | 语音输入、会议记录 |
| 流式转写 | `experimental_streamTranscribe` | 实验 | 实时字幕 |
| 语音翻译 | `experimental_streamTranslate` | 实验 | 同声传译 |
| 视频生成 | `experimental_generateVideo` | 实验 | 文生视频 |
| 实时语音 | Realtime + `experimental_useRealtime` | 实验 | 语音通话 Agent |
| 文件上传复用 | `uploadFile` | 稳定 | 大文件 / PDF 的 provider 引用 |
| Skill 上传 | `uploadSkill` | 稳定 | 给模型挂可复用技能包 |

> **注意（v7）：** 结构化输出已统一进 `generateText` / `streamText` 的 `output`。  
> 不要再用 v4 的 `generateObject` / `streamObject` 作为新项目主 API。

```ts
import { generateText, Output } from "ai";
import { z } from "zod";

const { output } = await generateText({
  model: "anthropic/claude-sonnet-4",
  output: Output.object({
    schema: z.object({
      title: z.string(),
      tags: z.array(z.string()),
      score: z.number(),
    }),
  }),
  prompt: "分析这篇文章",
});
```

---

## 3. 工具 / Agent

| 功能 | API | 状态 | 适合做什么 |
|---|---|---|---|
| 定义工具 | `tool()` | 稳定 | 查天气、查库、调内部 API |
| 动态工具 | `dynamicTool()` | 稳定 | 运行时才决定工具集 |
| 工具循环 Agent | `ToolLoopAgent` | 稳定 | **通用 Agent 首选** |
| 工作流 Agent | `WorkflowAgent` | 稳定 | 长任务、可恢复、带审批 |
| 外部 Harness | `HarnessAgent` | 稳定 | 套 Claude Code / Codex / Pi |
| 子 Agent | subagents | 稳定 | 主从分工、专项子任务 |
| 记忆 / 运行时状态 | `runtimeContext` | 稳定 | 租户、进度、凭据（不要塞进 prompt） |
| 工具私有上下文 | `toolsContext` + `contextSchema` | 稳定 | 每个工具自己的密钥 / 配置 |
| 工具审批 | `toolApproval` / policy | 稳定 | 删数据、转账、发邮件先确认 |
| 循环停止条件 | `isStepCount` / `hasToolCall` / `isLoopFinished` | 稳定 | 限制步数、调用某工具后停止 |
| MCP 工具 | `createMCPClient` | 稳定 | 接 MCP Server |
| MCP Apps | MCP Apps + `experimental_MCPAppRenderer` | 部分实验 | 工具结果里嵌交互 UI |
| Code Mode | code-mode | 稳定 | 模型写代码再执行 |
| 沙箱执行 | `experimental_sandbox` | 实验 | 安全跑命令 |
| 终端调试 UI | `@ai-sdk/tui` | 稳定 | 本地测 Agent |
| Agent → 前端流 | `createAgentUIStream` / `createAgentUIStreamResponse` / `pipeAgentUIStreamToResponse` | 稳定 | Agent 结果直接打到聊天 UI |
| 实时工具定义 | `experimental_getRealtimeToolDefinitions` | 实验 | 把 AI SDK tools 转成 realtime 工具 |

### 工具示例

```ts
import { tool, generateText } from "ai";
import { z } from "zod";

const weather = tool({
  description: "查城市天气",
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => fetchWeather(city),
});

await generateText({
  model: "openai/gpt-5",
  tools: { weather },
  prompt: "北京今天冷不冷？",
});
```

### Agent 示例

```ts
import { ToolLoopAgent, tool } from "ai";

const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4",
  tools: { weather },
});

const { text, steps } = await agent.generate({
  prompt: "根据天气决定要不要带伞",
});
```

选型建议：

- 大多数产品 Agent → **`ToolLoopAgent`**
- 长流程、要持久化 / 审批 → **`WorkflowAgent`**
- 直接跑现成编码 Agent → **`HarnessAgent`**
- 不要自己手写 tool loop，除非有特殊协议需求

---

## 4. 前端 UI

安装对应框架包：

```bash
npm i ai @ai-sdk/react          # React / Next.js
npm i ai @ai-sdk/vue            # Vue / Nuxt
npm i ai @ai-sdk/svelte         # Svelte / SvelteKit
npm i ai @ai-sdk/angular        # Angular
```

| 功能 | API | 框架 | 适合做什么 |
|---|---|---|---|
| 聊天 | `useChat` | React、Vue、Svelte、Angular | ChatGPT 式对话 |
| 补全 | `useCompletion` | React、Svelte、Angular | 写作框、续写、单次生成 |
| 流式 JSON 对象 | `useObject` | React / Svelte / Angular | 边生成边填卡片、表单 |
| 实时语音 | `experimental_useRealtime` | React | 语音对话 |
| 消息持久化 | Chatbot Message Persistence | — | 刷新不丢历史 |
| 断线续流 | Chatbot Resume Streams | — | 刷新后接着打字 |
| 聊天里调工具 | Chatbot Tool Usage | — | 展示 tool call / 结果 / 审批 |
| 生成式 UI | Generative User Interfaces | — | 模型决定渲染哪个组件 |
| 自定义流数据 | Streaming Custom Data | — | 进度条、来源引用、状态 |
| 消息 metadata | Message Metadata | — | 模型名、token、耗时 |
| 直连 Agent | `DirectChatTransport` | — | 前端直接打 Agent，少一层自定义 API |
| MCP 应用渲染 | `experimental_MCPAppRenderer` | React | 沙箱 iframe 工具 UI |
| 消息转换 | `convertToModelMessages` | — | UI 消息 → 模型消息 |
| 历史裁剪 | `pruneMessages` | — | 控制上下文长度 |
| UI 流创建 | `createUIMessageStream` | — | 自建传输层 |
| UI 流响应 | `createUIMessageStreamResponse` | — | 作为 HTTP 响应吐出 |
| 管道到 Node 响应 | `pipeUIMessageStreamToResponse` | — | Express / Node `ServerResponse` |
| 读取 UI 流 | `readUIMessageStream` | — | 把 chunk 合成完整 `UIMessage` |
| 消息校验 | `validateUIMessages` / `safeValidateUIMessages` | — | 持久化前后校验 |
| 类型推断 | `InferUITools` / `InferUITool` | — | 工具类型安全 |

### 聊天最小例子

```ts
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleSubmit, status, stop } = useChat();

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>{m.role}: {/* 渲染 parts */}</div>
      ))}
      <input value={input} onChange={() => {}} />
      {status === "streaming" && <button onClick={stop}>停止</button>}
    </form>
  );
}
```

聊天产品建议同时做这四件：

1. `useChat` + `streamText`
2. 消息持久化
3. 断线续流
4. 工具调用 UI（若有 Agent）

---

## 5. 生成式 UI / RSC

| 功能 | 状态 | 说明 |
|---|---|---|
| AI SDK UI Generative UI | 稳定（推荐） | 用 tool result 映射 React/Vue 组件 |
| AI SDK RSC | **实验** | 服务端直接流式 React 组件、保存/恢复 UI 状态 |
| 多步交互界面 | RSC 实验 | 分步表单、向导 |
| 流式值 / loading / error | RSC 实验 | 服务端流式状态 |

> 新项目：用 **AI SDK UI** 做生成式界面。  
> RSC 仅在已有 RSC 架构、且能接受实验 API 时考虑。官方建议生产走 UI 层，并提供 RSC → UI 迁移指南。

---

## 6. 生产 / 工程能力

| 功能 | API | 状态 | 适合做什么 |
|---|---|---|---|
| 多模型注册表 | `createProviderRegistry` | 稳定 | 一行切 GPT / Claude / Grok |
| 语言模型中间件 | `wrapLanguageModel` | 稳定 | 缓存、改 prompt、护栏、日志 |
| 图像模型中间件 | `wrapImageModel` | 稳定 | 生图统一拦截 |
| 默认指令中间件 | `defaultInstructionsMiddleware` | 稳定 | 全局 system prompt |
| 默认设置中间件 | `defaultSettingsMiddleware` | 稳定 | 全局 temperature 等 |
| 工具示例中间件 | `addToolInputExamplesMiddleware` | 稳定 | 提高 tool 入参质量 |
| 抽 JSON 中间件 | `extractJsonMiddleware` | 稳定 | 去掉 markdown 围栏 |
| 抽推理过程 | `extractReasoningMiddleware` | 稳定 | 展示思考链 |
| 模拟流式 | `simulateStreamingMiddleware` | 稳定 | 不支持流的模型也打字 |
| Schema 适配 | `zodSchema` / `valibotSchema` / `jsonSchema` | 稳定 | 多套 schema 库 |
| Fallback | 内置 | 稳定 | 主模型挂了切备用 |
| 超时 | total / step / chunk / tool | 稳定 | 防卡死，抛 `TimeoutError` |
| 生命周期 | `onStart` / `onStepEnd` / `onEnd` | 稳定 | 日志、计费、埋点 |
| 性能统计 | step 结果里的耗时 / tokens/s | 稳定 | 监控、计费 |
| Telemetry | OpenTelemetry | 稳定 | Langfuse、Helicone、Sentry 等 |
| 测试 | mock 模型 / `simulateReadableStream` | 稳定 | 单测不打真实 API |
| 平滑输出 | `smoothStream` | 稳定 | 打字更匀 |
| ID 生成 | `generateId` / `createIdGenerator` | 稳定 | 消息 / 步骤 ID |
| DevTools | AI SDK DevTools | 稳定 | 调试 stream / tool call |
| AI Gateway | Gateway 模型 ID | 稳定 | 一个入口路由所有模型 |
| 错误处理 | 分类错误 + UI error handling | 稳定 | 重试、友好提示 |

### 常见可接的可观测平台

Arize AX、Axiom、Braintrust、Helicone、Laminar、Langfuse、LangSmith、LangWatch、PostHog、Sentry、SigNoz、Weave 等（走 OpenTelemetry）。

---

## 7. 官方 Provider 能力对照

`✓` = 官方文档标明支持。空 = 文档未标（不等于绝对不能，以该 Provider 页为准）。

### 7.1 语言 / 多模态主 Provider

| Provider | 图输入 | 生图 | 结构化 | 工具 | 工具流式 |
|---|---|---|---|---|---|
| Vercel AI Gateway | ✓ | ✓ | ✓ | ✓ | ✓ |
| OpenAI | ✓ | ✓ | ✓ | ✓ | ✓ |
| xAI Grok | ✓ | ✓ | ✓ | ✓ | ✓ |
| Amazon Bedrock | ✓ | ✓ | ✓ | ✓ | ✓ |
| Google Vertex AI | ✓ | ✓ | ✓ | ✓ | ✓ |
| Anthropic | ✓ | | ✓ | ✓ | ✓ |
| Google Generative AI | ✓ | | ✓ | ✓ | ✓ |
| Azure | ✓ | | ✓ | ✓ | ✓ |
| Groq | ✓ | | ✓ | ✓ | ✓ |
| DeepInfra | ✓ | | ✓ | ✓ | ✓ |
| Fireworks | | ✓ | ✓ | ✓ | ✓ |
| Together.ai | | | ✓ | ✓ | ✓ |
| DeepSeek | | | ✓ | ✓ | ✓ |
| Cerebras | | | ✓ | ✓ | ✓ |
| Mistral | ✓ | | ✓ | | ✓ |
| Cohere | | | | ✓ | ✓ |
| Baseten | | | ✓ | ✓ | |
| Fal AI | | ✓ | | | |
| Luma AI | | ✓ | | | |
| Perplexity | | | | | |

### 7.2 其他官方相关 Provider（按用途）

| 类别 | Provider 示例 |
|---|---|
| 语音 TTS / STT | ElevenLabs、Deepgram、AssemblyAI、Cartesia、Gladia、LMNT、Hume、Rev.ai、Fish Audio |
| 图像 / 视频 | Fal AI、Luma AI、Replicate、Prodia、Kling AI、ByteDance |
| 聚合 / 云 | Hugging Face、Moonshot AI、Alibaba、MiniMax、Z.AI |
| 路由层 | Vercel AI Gateway |

### 7.3 常见社区 Provider

Ollama、OpenRouter、Cloudflare Workers AI、Qwen、Zhipu AI、Portkey、Requesty、SambaNova、llama.cpp、Claude Code CLI、Codex CLI 等。

能力以社区包为准，接入方式仍是 AI SDK Provider 接口。

---

## 8. 框架与运行时

| 环境 | 官方入门 |
|---|---|
| Next.js App Router | 推荐，文档最全 |
| Next.js Pages Router | 支持 |
| Node.js | 支持（脚本、Worker、Express） |
| Svelte / SvelteKit | 支持 |
| Vue / Nuxt | 支持 |
| Expo | 支持 |
| TanStack Start | 支持 |
| Angular | UI 包支持 |
| Coding Agents（Cursor / Claude Code 等） | 有专门 Getting Started |

---

## 9. 按产品类型选型

| 你要做的应用 | 最少要用的功能 | 建议先不做 |
|---|---|---|
| 多模型聊天 | `useChat` + `streamText` + 消息持久化 + Provider Registry | 视频、实时语音 |
| RAG 知识库 | `embed` / `embedMany` + 向量库 + `streamText` + 引用 metadata | Agent 审批 |
| 智能填表 / 抽取 | `Output.object()` + `useObject` | 聊天续流 |
| 带工具的助手 | `ToolLoopAgent` + `tool()` + 聊天 Tool UI | Harness / sandbox |
| 需人工确认的 Agent | 同上 + `toolApproval` | 实时语音 |
| 文生图工作室 | `generateImage` + 图输入（改图） | 视频生成 |
| 语音助手（非实时） | `transcribe` + `generateSpeech` | Realtime WebSocket |
| 实时语音 Agent | `experimental_useRealtime` + realtime tools | 当主路径前要能接受实验变更 |
| 编码 Agent | `HarnessAgent` 或 Code Mode + sandbox | 自制 REPL |
| 多 Agent 分工 | `ToolLoopAgent` + subagents + `runtimeContext` | 过早上 Workflow 持久化 |
| 内部知识库 + 自然语言查库 | 结构化输出 + tools + RAG | 生图 |
| MCP 工具市场 / 插件 | `createMCPClient` + MCP Apps | 自研插件协议 |

---

## 10. 推荐最小技术栈

### A. 标准聊天产品

```
streamText
+ useChat
+ 消息持久化
+ 断线续流
+ Provider Registry（多模型切换）
+ 错误处理 / 停止生成
```

### B. 工具型 Agent 产品

```
ToolLoopAgent
+ tool() / dynamicTool()
+ toolApproval（敏感操作）
+ runtimeContext
+ createAgentUIStreamResponse
+ useChat（Tool UI）
```

### C. RAG 产品

```
embedMany          // 入库
embed              // 查询
向量数据库
（可选）rerank
streamText         // 带检索上下文生成
message metadata   // 展示来源
```

### D. 结构化业务（表单 / 抽取 / 路由）

```
generateText + Output.object()
zod schema 校验
useObject（需要流式预览时）
```

**原则**

1. 主路径只用稳定 API。
2. 实验项（视频、实时语音、sandbox、RSC、MCP App Renderer）当增值。
3. Agent 用 `ToolLoopAgent`，不要手写循环。
4. 结构化输出用 `Output.object()`，不要用 v4 `generateObject`。
5. 密钥只放服务端；`toolsContext` 传给工具，不要进 prompt。

---

## 11. 核心 API 速查

### 11.1 Core

| API | 作用 |
|---|---|
| `generateText` | 非流式文本 + 工具 |
| `streamText` | 流式文本 + 工具 |
| `embed` / `embedMany` | 向量 |
| `generateImage` | 生图 |
| `generateSpeech` | TTS |
| `transcribe` | STT |
| `uploadFile` / `uploadSkill` | 上传并拿 provider 引用 |
| `tool` / `dynamicTool` | 定义工具 |
| `ToolLoopAgent` | 通用 Agent |
| `createMCPClient` | MCP 客户端 |
| `createProviderRegistry` | 多模型注册 |
| `wrapLanguageModel` | 中间件 |
| `cosineSimilarity` | 向量相似度 |
| `smoothStream` | 平滑流式输出 |
| `experimental_generateVideo` | 视频生成 |
| `experimental_streamTranscribe` | 流式转写 |
| `experimental_streamTranslate` | 语音翻译 |

### 11.2 UI

| API | 作用 |
|---|---|
| `useChat` | 聊天 |
| `useCompletion` | 补全 |
| `useObject` | 流式对象 |
| `experimental_useRealtime` | 实时语音 |
| `convertToModelMessages` | UI → Model 消息 |
| `createUIMessageStreamResponse` | UI 流 HTTP 响应 |
| `DirectChatTransport` | 直连 Agent |

### 11.3 停止条件

| API | 作用 |
|---|---|
| `isStepCount(n)` | n 步后停 |
| `hasToolCall(name)` | 调用指定工具后停 |
| `isLoopFinished` | 自然结束 |

---

## 12. 官方链接

| 内容 | URL |
|---|---|
| 总览 | [https://ai-sdk.dev/docs/introduction](https://ai-sdk.dev/docs/introduction) |
| Core | [https://ai-sdk.dev/docs/ai-sdk-core/overview](https://ai-sdk.dev/docs/ai-sdk-core/overview) |
| UI | [https://ai-sdk.dev/docs/ai-sdk-ui/overview](https://ai-sdk.dev/docs/ai-sdk-ui/overview) |
| Agents | [https://ai-sdk.dev/docs/agents/overview](https://ai-sdk.dev/docs/agents/overview) |
| Core API Reference | [https://ai-sdk.dev/docs/reference/ai-sdk-core](https://ai-sdk.dev/docs/reference/ai-sdk-core) |
| UI API Reference | [https://ai-sdk.dev/docs/reference/ai-sdk-ui](https://ai-sdk.dev/docs/reference/ai-sdk-ui) |
| Providers | [https://ai-sdk.dev/providers/ai-sdk-providers](https://ai-sdk.dev/providers/ai-sdk-providers) |
| GitHub | [https://github.com/vercel/ai](https://github.com/vercel/ai) |
| AI SDK 7 Changelog | [https://vercel.com/changelog/ai-sdk-7](https://vercel.com/changelog/ai-sdk-7) |

---

## 附录：能力 → 页面功能对照（给产品 / 设计用）

| 页面功能 | SDK 能力 | 优先级建议 |
|---|---|---|
| 模型切换（GPT / Claude / Grok…） | Provider Registry / Gateway | P0 |
| 流式回答 | `streamText` + `useChat` | P0 |
| 停止生成 | `useChat.stop` | P0 |
| 历史会话 | message persistence | P0 |
| 刷新后续流 | resume streams | P1 |
| 上传图片 / PDF | file parts + `uploadFile` | P1 |
| 引用知识库 | embeddings + metadata | P1 |
| 调用内部系统 | `tool()` | P1 |
| 危险操作确认 | `toolApproval` | P1 |
| 展示思考过程 | `reasoning` + extract middleware | P2 |
| 语音输入 | `transcribe` | P2 |
| 语音播报 | `generateSpeech` | P2 |
| 文生图 | `generateImage` | P2 |
| 实时通话 | experimental Realtime | P3 |
| 文生视频 | experimental video | P3 |
| MCP 插件 | `createMCPClient` | P3 |

---

---

## 13. Enjoy Agents 落地状态（2026-08-31）

标记：

- **已实现**：本仓主路径可用（本地 IPC，不走 HTTP `useChat`）
- **Provider 依赖**：SDK/本仓已接线，实际效果看所选模型与 Key
- **实验**：已接线但带 experimental 标记与降级
- **有意不采用**：架构决策，不是没做完

| SDK 能力 | 落地状态 | 说明 |
|---|---|---|
| `generateText` / `streamText` | 已实现 | `agent.run` 流式；`ai.generate` kind=text/completion 走 `streamPlainText` |
| `Output.object()` / `Output.array()` | Provider 依赖 | `streamStructuredPartials` 发多次 `structured.delta`；失败再 `generateStructuredRepaired`；JSON Schema / Valibot 形经 `toZodSchema` |
| `reasoning` / `stopWhen` / 工具循环 | 已实现 | ToolLoopAgent；`stopWhen` = `stepCountIs` + `isLoopFinished` + 可选 `hasToolCall`；`prepareStep` 裁历史；`onStepFinish` 写 `run_steps` |
| `toolApproval` | 已实现 | 写盘 / bash / commit / MCP 写工具；落库 HMAC，`decideApproval` 验签 |
| `WorkflowAgent` durable | 部分 | 自研 checkpoint / resume / retry；`ai.resume` 按 kind 分流（workflow 续步，其它用 generation 快照重启）；不是 SDK `WorkflowAgent` |
| 子 Agent 摘要 | 已实现 | `delegate` 回 `SubagentSummary`；plan/ask 只读；agent/debug 写盘走主循环同一条 `decideApproval` |
| `embed` / `cosineSimilarity` / rerank | 已实现 | 索引 hashed + Provider 覆盖；模型漂移 Resume 重嵌；`ai.generate` embedding/rerank 已接线；有 Cohere 时走 SDK `rerank`，否则本地融合 |
| `generateImage` / `generateSpeech` / `transcribe` | Provider 依赖 | 资产库 + `asset.created`；OpenAI 兼容 + 官方 Fal/Replicate/ElevenLabs/Deepgram/Cohere 工厂；同族备用模型 |
| `experimental_streamTranslate` | 实验 | `kind=translation` + Media Translate；OpenAI `translation()`；模型不合法返回 null |
| `experimental_generateVideo` / Realtime | 实验 | 视频：`@ai-sdk/xai` `.video()` / Fal / Replicate；失败不回落静图；Realtime 先试 Provider WS，失败回落本地回环 |
| `uploadFile` / `uploadSkill` | Provider 依赖 | `assets.upload` + hash 缓存 `provider_file_refs` |
| `createMCPClient` / MCP Apps | 已实现 | SDK 无导出时本机会话：`tools/list` + `tools/call`；Trust 后注入 Agent；`mcp.openApp` / `mcp.appMessage` 隔离 iframe，消息在 main 消毒 |
| `createProviderRegistry` / 能力探测 | 已实现 | `createEnjoyRegistry` + 静态目录；`probeProvider` 写入 `probedCaps`；Gateway 官方工厂；媒体 kind 探测不打 `/models` |
| Telemetry / 超时 / fallback / 脱敏 | 已实现 | Agent/generate 写 TTFO 与 tokens/s；`agentTimeoutMs` / `stepTimeoutMs` / `timeoutMs` 到点发 timeout 警告；bash 用 `toolTimeoutMs`；OTEL 仅合法 endpoint POST 自建 OTLP JSON |
| Harness / Code Mode / Sandbox | 已实现 | Claude Code / Codex / OpenCode 接官方适配器（桥接要 Vercel）；Pi 默认 just-bash；DeepSeek 仍占位；Code Mode 走写盘+bash 审批 |
| `useChat` / `useCompletion` / `useObject` | 已实现 | IPC hook，不是 HTTP / `@ai-sdk/react`；`ai.generate` kind=`agent` 转发 `runAgent`；窗口 E2E 用 `ENJOY_E2E_STUB` 跑发送/停止/恢复/审批/抽取 |
| RSC / DirectChatTransport HTTP / `@ai-sdk/tui` 桌面 UI | 有意不采用 | 见 `ai-capabilities` spec |

*本文档根据 AI SDK 7 官方文档整理，用于应用选型。具体模型是否支持某能力，以对应 Provider 文档为准。*
