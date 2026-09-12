# spec/workflow

> Durable Workflow：检查点、暂停、恢复。最后更新：2026-09-12

## 当前真相

`runDurableWorkflow` 在 `packages/agent-core/src/agents/workflow.ts`。每步写入 `runs` / `run_steps` checkpoint，并 emit `workflow.checkpoint` / `step.start` / `step.end` / `workflow.paused`。有 workspace 时每步 `runWorkflowAgentStep` 走同一条 `agent.run`（审批 / 工具 / HMAC 都在主循环），等待 `run.end`。没有窗口或没有 workspace 会跳过并写明原因。退出后状态为 paused；`workflow.start` 建骨架 run，`workflow.resume` 从最近 `stepIndex` 续跑。支持 cancel / retry。偏好 `workflowAutoResume` 为真时，启动应用会 `recoverPausedWorkflows`。仍不是 SDK `WorkflowAgent`。

UI `#/workflows` 在 `AppShell` 内换轨。对齐原型 Slide 8：展示预设流水线配方与 DAG 运行列表；支持 `Resume` / `Retry` / `Cancel` 控制，并提供 `Open in Chat →` 链接跳转回关联的会话画布。列表按依赖分层画 DAG（`workflow-dag`）。

子 Agent 回 `SubagentSummary`，同时把子工具事件挂到父 `delegate`（`parentToolCallId`）。写盘必须走主循环同一条审批，不能另开后门。页面文案必须写明每步是 `agent.run`，禁止再写「一键自主 / 假完成」。Chat 思考树花名册（连续顶层 `delegate`）不是 `#/workflows` DAG：前者是同一轮 ToolLoop 派工，后者是 durable `agent.run` 步骤图。

路由：`#/workflows`。设置：Workflow Recovery。

## 不变量

- 子 Agent 与 Workflow 步骤执行只在 main。
- 崩溃恢复只信任 SQLite checkpoint，不信任 renderer 内存。

## 代码入口

- `packages/agent-core/src/agents/workflow.ts`
- `apps/desktop/src/main/services/workflow-runner.ts`

## 已知坑

- 步骤支持 `dependsOn` 拓扑排序与 `layerWorkflowSteps` 分层。UI 用链式文本生成 DAG 并分层展示，不是节点画布。环在 `orderWorkflowSteps` 会被拒绝。
