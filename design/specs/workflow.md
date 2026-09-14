# spec/workflow

> Durable Workflow：检查点、暂停、恢复、步级重试。最后更新：2026-09-14

## 当前真相

`runDurableWorkflow` 在 `packages/agent-core/src/agents/workflow.ts`。每步写入 `runs` / `run_steps` checkpoint，并 emit `workflow.checkpoint` / `step.start` / `step.end` / `workflow.paused`。有 workspace 时每步 `runWorkflowAgentStep` 走同一条 `agent.run`（审批 / 工具 / HMAC 都在主循环），等待 `run.end`；收工摘要取子 run transcript 尾巴（`waitForRunSettle` 返回 `{status, summary}`），不再是 `"X finished (run id)"` 合成文案。缺 active profile / apiKey 时 fail-fast 抛错（run 落 `failed` + 人话 error），不再静默 `"X failed"`。

`workflow.resume` **立即返回**：`driveWorkflow` 在 main 后台推进，IPC 不被多步循环阻塞；进度靠 `workflow.*` 事件与 renderer 1.5s 轮询（running / waiting_review 都轮询）。`workflow.pause` 把 runId 塞进请求集，durable loop 在下一步边界落 `paused`。`workflow.retry` 可带 `stepId`：从该步（含）重跑，先 `deleteRunStepsFrom` 清掉过期步骤行再归位 checkpoint。`workflow.cancel` 连带 abort 当前子 agent run（进程内 `childRuns` Map），loop 在下一个 persist 边界退出且不覆盖 cancelled。DB 列 `run_steps.child_run_id` 与 Zod `WorkflowStep.childRunId` **已有**，生产路径 **未写入、getWorkflow 未投影**——不要写成 DAG 已能按 child run 穿透。子 run 停车审批时，workflow 行经 1s 轮询对齐成 `waiting_review`，恢复后回到 `running`。步骤抛错 → run 落 `failed`。偏好 `workflowAutoResume` 为真时，启动应用会 `recoverPausedWorkflows`。仍不是 SDK `WorkflowAgent`。

状态词表统一：`WorkflowStatus` 用 `waiting_review`（与 `runs.status` / `TaskStatus` 同词表；旧的 `waiting_approval` 已删，renderer `workflow-dag` 同步）。

UI `#/workflows` 在 `AppShell` 内换轨。工作流编辑器已换成 infinite-canvas 同构无限画布（节点/视口/连线/工具坞从开源项目移植，命名走本仓 kebab-case）：
- 左侧情境栏是画布项目列表（本地 `localStorage`，key `enjoy-agents:workflow-canvas-v1`）。
- 中间是世界坐标无限画布：默认抓手工具、空格/Ctrl 临时切换、滚轮光标缩放 0.05–5、点阵/网格/空白背景、框选、节点拖拽、四角缩放、端口拉线、双击空白新建菜单。
- 节点类型对齐开源项目：`image` / `text` / `config` / `video` / `audio` / `group`。
- 底栏浮动工具坞 + 左下缩放坞 + 小地图。节点下方生成条带模型选择（按 image/video/audio/text 过滤能力），选中的 `metadata.model` + `metadata.providerId` 交给 `ai.generate`（renderer 不碰密钥）。生图模型（`grok-imagine-image` 等）不会被设置页 `defaultImageModelId` 覆盖。失败时节点展示 `run.error` 原文，不再写成固定的 `Generation failed.`。
- 顶栏保留 `data-testid="workflow-start"` 启动 durable Plan→Act→Verify。画布容器带 `data-testid="workflow-dag"`。
- 未移植：节点插件、第三方提示词源、裁剪/蒙版/超分、画布内助手。

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
- UI 画布：`apps/desktop/src/renderer/src/components/workflows/canvas/`（视口 `infinite-canvas.tsx`，编辑器 `canvas-editor.tsx`）

## 已知坑

- **隐患**：崩溃恢复后取消找不到子 agent。根因：`childRuns` 是内存 Map；`insertRunStep` 不写 `childRunId`，也未调 `updateRunStepChildRunId`。正确做法：未接线前只 abort 仍在 Map 里的子 run；持久化再补写库 + `getWorkflow` 投影。
- 步骤支持 `dependsOn` 拓扑排序与 `layerWorkflowSteps` 分层。画布连线是编辑态 DAG；durable 执行仍严格串行。环在 `orderWorkflowSteps` 会被拒绝。
- 画布节点曾把 `run.error` 收成固定英文 `Generation failed.`，真实原因（错档案、无字节、供应商原文）看不到。正确做法：`applyCanvasGenerationEvent` 把 `event.message` 写进 `errorDetails`。
- `executeKind` 曾无条件用设置页 `defaultImageModelId` 覆盖请求模型，画布选中 `grok-imagine-image` 也会被换成聊天默认生图模型；`requireProviderConfig` 只读当前激活档案，忽略 `GenerationRequest.providerId`。正确做法：image-only 请求原样使用；按 `providerId` 解析 vault。
- `workflow.lastCheckpointId` 是 `cp_<stepIndex>` 形式的 id，不是整份 checkpoint JSON（曾返回整个 JSON 字符串，已修）。
- 取消发生在步骤中途时，子 run 被 abort → 步骤抛错 → catch 里先看行状态是 `cancelled` 就直接返回，不会把 cancelled 覆写成 failed。
