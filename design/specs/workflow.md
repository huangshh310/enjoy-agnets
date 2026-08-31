# spec/workflow

> Durable Workflow：检查点、暂停、恢复。最后更新：2026-08-31

## 当前真相

`runDurableWorkflow` 在 `packages/agent-core/src/agents/workflow.ts`。每步写入 `runs` / `run_steps` checkpoint，并 emit `workflow.checkpoint` / `step.start` / `step.end` / `workflow.paused`。Act/Verify 若有 workspace 会检索 Knowledge 作为步骤摘要，不是空 stub。退出后状态为 paused；`workflow.start` 建骨架 run，`workflow.resume` 从最近 `stepIndex` 续跑。支持 cancel / retry。偏好 `workflowAutoResume` 为真时，启动应用会 `recoverPausedWorkflows`。仍不是 SDK `WorkflowAgent`。

UI `#/workflows` 用 `plan>act>verify` 这类依赖链生成 `dependsOn` 步骤并写入 checkpoint；缺省仍是 Plan→Act→Verify。列表按依赖分层画 DAG（`workflow-dag`），不是可拖拽节点画布。

子 Agent 只回传 `SubagentSummary`。写盘必须走主循环同一条审批，不能另开后门。

路由：`#/workflows`。设置：Workflow Recovery。

## 不变量

- 子 Agent 与 Workflow 步骤执行只在 main。
- 崩溃恢复只信任 SQLite checkpoint，不信任 renderer 内存。

## 代码入口

- `packages/agent-core/src/agents/workflow.ts`
- `apps/desktop/src/main/services/workflow-runner.ts`

## 已知坑

- 步骤支持 `dependsOn` 拓扑排序与 `layerWorkflowSteps` 分层。UI 用链式文本生成 DAG 并分层展示，不是节点画布。环在 `orderWorkflowSteps` 会被拒绝。
