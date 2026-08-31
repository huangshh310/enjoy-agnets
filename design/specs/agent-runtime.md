# spec/agent-runtime

> 主进程里的 ToolLoopAgent：流式、工具、审批、模式。最后更新：2026-08-31

## 当前真相

内核在 `packages/agent-core`（纯 TS）。Electron main 的 `agent-runner` 建模型、注入 workspace host、消费 `fullStream`，映射成 `StreamEvent` 再 `webContents.send("agent.event")`。

模式（`AgentMode`）：`agent` / `plan` / `ask` / `debug`。系统提示由 `systemPromptFor(mode)` 拼出。`plan` / `ask` 只读；`agent` / `debug` 可写，危险工具走审批。

可选第二运行时：`codingRuntime: "harness"` 走 `packages/agent-harness`。那是插件位，不是默认内核。

### 内置工具

| 工具 | 审批 | 说明 |
|---|---|---|
| `read_file` | 否 | 限工作区相对路径 |
| `list_dir` | 否 | |
| `glob` | 否 | 最多 400 条 |
| `grep` | 否 | 最多 200 条 |
| `edit_file` | 是 | 工作区写 + diff |
| `write_file` | 是 | |
| `bash` | 是 | cwd 锁工作区；超时；输出截断 |

工具输出超过约 80_000 字符截断。写 / bash / commit 集合见 `WRITE_TOOLS` / `BASH_TOOLS` / `COMMIT_TOOLS`。

审批策略来自用户偏好：`requireWriteApproval`、`requireBashApproval`、`requireCommitApproval`、`permissionMode`。UI 决定：`allow` / `deny` / `allow_session`。执行只在 main。

### 流事件（实现已有）

`run.start` → `text.delta` / `reasoning.delta` / `tool.start` / `tool.args.delta` / `tool.result` / `approval.required` / `approval.resolved` / `file.changed` → `run.end` | `run.error`

会话消息存在 SQLite。助手侧复杂载荷用 `assistant-payload` 序列化（reasoning + tool 折叠），不要把 tool JSON 当纯文本渲染。

## 不变量

- 不在 React 组件里跑 agent 循环。
- 不把整仓源码塞进上下文；用 read / grep / glob 按需取。
- 工具被拒后模型不得用同一调用死磕（系统提示已写）。
- DeepSeek 带 tools 时必须回传上一轮 `reasoning`（见 `ChatMessage.reasoning`）。

## 代码入口

- 建 agent / 流：`packages/agent-core/src/agent.ts`
- 工具：`packages/agent-core/src/tools/index.ts`
- 审批：`packages/agent-core/src/tool-approval.ts`
- 主进程编排：`apps/desktop/src/main/services/agent-runner.ts`
- SDK 能力表：[../references/vercel-ai-sdk-7-feature-matrix.md](../references/vercel-ai-sdk-7-feature-matrix.md)

## 已知坑

- 建工具时必须闭包注入 `AgentWorkspaceHost`。AI SDK 7 不会把 runtimeContext 传进 `execute` 的 `options.context`。
- 结构化输出在 v7 已并入 `generateText` / `streamText` 的 `output`，不要再用旧的 `generateObject` 主路径。
- 渲染线程：Thinking 用 Beautiful UI 风格 trace，不要把 `message.content` 当纯字符串倒出来。
