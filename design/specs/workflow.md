# spec/workflow

> Durable Workflow：检查点、暂停、恢复、步级重试。最后更新：2026-09-12

## 当前真相

`runDurableWorkflow` 在 `packages/agent-core/src/agents/workflow.ts`。每步写入 `runs` / `run_steps` checkpoint，并 emit `workflow.checkpoint` / `step.start` / `step.end` / `workflow.paused`。有 workspace 时每步 `runWorkflowAgentStep` 走同一条 `agent.run`（审批 / 工具 / HMAC 都在主循环），等待 `run.end`；收工摘要取子 run transcript 尾巴（`waitForRunSettle` 返回 `{status, summary}`），不再是 `"X finished (run id)"` 合成文案。缺 active profile / apiKey 时 fail-fast 抛错（run 落 `failed` + 人话 error），不再静默 `"X failed"`。

`workflow.resume` **立即返回**：`driveWorkflow` 在 main 后台推进，IPC 不被多步循环阻塞；进度靠 `workflow.*` 事件与 renderer 1.5s 轮询（running / waiting_review 都轮询）。`workflow.pause` 把 runId 塞进请求集，durable loop 在下一步边界落 `paused`。`workflow.retry` 可带 `stepId`：从该步（含）重跑，先 `deleteRunStepsFrom` 清掉过期步骤行再归位 checkpoint。`workflow.cancel` 连带 abort 当前子 agent run（`childRuns` 映射），loop 在下一个 persist 边界退出且不覆盖 cancelled。子 run 停车审批时，workflow 行经 1s 轮询对齐成 `waiting_review`，恢复后回到 `running`。步骤抛错 → run 落 `failed`。偏好 `workflowAutoResume` 为真时，启动应用会 `recoverPausedWorkflows`。仍不是 SDK `WorkflowAgent`。

状态词表统一：`WorkflowStatus` 用 `waiting_review`（与 `runs.status` / `TaskStatus` 同词表；旧的 `waiting_approval` 已删，renderer `workflow-dag` 同步）。

UI `#/workflows` 在 `AppShell` 内换轨。对齐原型 Slide 8：展示预设流水线配方与 DAG 运行列表；支持 `Resume` / `Pause` / `Retry` / `Cancel` 控制（running 显示暂停 + 取消，waiting_review 显示取消），并提供 `Open in Chat →` 链接。列表按依赖分层画 DAG（`workflow-dag`）。

子 Agent 回 `SubagentSummary`，同时把子工具事件挂到父 `delegate`（`parentToolCallId`）。写盘必须走主循环同一条审批，不能另开后门。页面文案必须写明每步是 `agent.run`，禁止再写「一键自主 / 假完成」。Chat 思考树花名册（连续顶层 `delegate`）不是 `#/workflows` DAG：前者是同一轮 ToolLoop 派工，后者是 durable `agent.run` 步骤图。

路由：`#/workflows`。设置：Workflow Recovery。

## 不变量

- 子 Agent 与 Workflow 步骤执行只在 main。
- 崩溃恢复只信任 SQLite checkpoint，不信任 renderer 内存。
- 步骤类型只有 `agent` 一种（`DurableStep.run`）；并行层执行、tool/script 步骤类型仍是愿景，没落地前不得写「已支持」。

## 代码入口

- `packages/agent-core/src/agents/workflow.ts`
- `apps/desktop/src/main/services/workflow-runner.ts`
- `apps/desktop/src/main/services/workflow-step-agent.ts`

## 已知坑

- 步骤支持 `dependsOn` 拓扑排序与 `layerWorkflowSteps` 分层。UI 用链式文本生成 DAG 并分层展示，不是节点画布。环在 `orderWorkflowSteps` 会被拒绝；步与步严格串行，`dependsOn` 只影响 UI 排布，不做并行层执行。
- `workflow.lastCheckpointId` 是 `cp_<stepIndex>` 形式的 id，不是整份 checkpoint JSON（曾返回整个 JSON 字符串，已修）。
- 取消发生在步骤中途时，子 run 被 abort → 步骤抛错 → catch 里先看行状态是 `cancelled` 就直接返回，不会把 cancelled 覆写成 failed。
