# spec/workflow

> Durable Workflow：检查点、暂停、恢复、步级重试。最后更新：2026-09-14

## 当前真相

`runDurableWorkflow` 在 `packages/agent-core/src/agents/workflow.ts`。每步写入 `runs` / `run_steps` checkpoint，并 emit `workflow.checkpoint` / `step.start` / `step.end` / `workflow.paused`。有 workspace 时每步 `runWorkflowAgentStep` 走同一条 `agent.run`（审批 / 工具 / HMAC 都在主循环），等待 `run.end`；收工摘要取子 run transcript 尾巴（`waitForRunSettle` 返回 `{status, summary}`），不再是 `"X finished (run id)"` 合成文案。缺 active profile / apiKey 时 fail-fast 抛错（run 落 `failed` + 人话 error），不再静默 `"X failed"`。

`workflow.resume` **立即返回**：`driveWorkflow` 在 main 后台推进，IPC 不被多步循环阻塞；进度靠 `workflow.*` 事件与 renderer 1.5s 轮询（running / waiting_review 都轮询）。`workflow.pause` 把 runId 塞进请求集，durable loop 在下一步边界落 `paused`。`workflow.retry` 可带 `stepId`：从该步（含）重跑，先 `deleteRunStepsFrom` 清掉过期步骤行再归位 checkpoint。`workflow.cancel` 连带 abort 当前子 agent run（进程内 `childRuns` Map），loop 在下一个 persist 边界退出且不覆盖 cancelled。DB 列 `run_steps.child_run_id` 与 Zod `WorkflowStep.childRunId` **已有**，生产路径 **未写入、getWorkflow 未投影**——不要写成 DAG 已能按 child run 穿透。子 run 停车审批时，workflow 行经 1s 轮询对齐成 `waiting_review`，恢复后回到 `running`。步骤抛错 → run 落 `failed`。偏好 `workflowAutoResume` 为真时，启动应用会 `recoverPausedWorkflows`。仍不是 SDK `WorkflowAgent`。

状态词表统一：`WorkflowStatus` 用 `waiting_review`（与 `runs.status` / `TaskStatus` 同词表；旧的 `waiting_approval` 已删，renderer `workflow-dag` 同步）。

UI `#/workflows` 在 `AppShell` 内换轨。工作流编辑器对齐 infinite-canvas 同构无限画布，并融合 Enjoy Agents BoardUI 规范：
- 左侧情境栏是画布项目列表（本地 `localStorage`，key `enjoy-agents:workflow-canvas-v1`）。
- 中间是世界坐标无限画布：冷灰/石板微底与中性卡片（适配白天/暗夜主题）、默认抓手工具、空格/Ctrl 临时切换、滚轮光标缩放 0.05–5、点阵/网格/空白背景（收纳进外观 Popover 面板）、框选、节点拖拽、四角白底微圆角悬浮缩放手柄、端口呼吸发光与拉线、双击空白新建菜单。
- 节点规范：所有节点内嵌标准化 Node Header（类型图标 + 双击就地重命名 + 状态指示徽标 + 类型微标），卡片采用 `rounded-2xl`、柔和边框与 `shadow-card`，选中态采用 Signal Blue 柔和光晕；节点类型支持 `image` / `text` / `config` / `video` / `audio` / `group`。
- 底栏浮动工具坞（h-12 胶囊，带选择/抓手分段控制器、Appearance 外观收纳弹层与 DockTip 快捷键指示）+ 左下缩放坞（h-12 统一高度与快捷键面板）+ 小地图。节点下方生成条带模型选择（按 image/video/audio/text 过滤能力），选中的 `metadata.model` + `metadata.providerId` 交给 `ai.generate`（renderer 不碰密钥）。生图模型（`grok-imagine-image` 等）不会被设置页 `defaultImageModelId` 覆盖。失败时节点展示 `run.error` 原文，不再写成固定的 `Generation failed.`。
- 顶栏：项目节点数量微标、删除项目防误触二次确认弹窗（Confirm Dialog）、`data-testid="workflow-start"` 启动 DAG 流水线与 `data-testid="workflow-stop"` 停止流水线。画布容器带 `data-testid="workflow-dag"`。
- 画布 DAG 真实打通：点击「启动流水线」使用 `canvasToWorkflowGraph` 将画布节点与连线解析为带有 DAG 依赖（`dependsOn`）的 `WorkflowStepDraft[]`，进行 Kahn 拓扑排序与成环/自环检测（回路环浮动警报拦截，成环节点实时标红高亮并加注「回路异常」徽标，空画布回退 Plan→Act→Verify 默认三步，单画布最多 32 个执行节点）。
- 画布执行状态实时投影：画布节点（`CanvasNode`）实时接收活跃工作流运行（`activeWorkflowRun`）的各步状态（`running` 流光蓝、`waiting_review` 琥珀警示发光、`completed`、`failed`），展示旋转指示与步骤徽标。
- 节点悬浮快捷条（`CanvasNodeHoverToolbar`）：选中或悬浮单节点时浮现快捷工具（查看节点信息与格式化 JSON、删除、存资产至持久化资产库、打开生图面板、字号 A-/A+、素材下载、解散编组、复制）；具备视口边界智能翻转（顶部空间不足时翻转至节点下方）与视口 Clamp 防溢出。
- 选区操作栏（`CanvasSelectionToolbar`）：多选 2 个及以上节点时在包围盒上方展示一键成组（Group）、6 种对齐方式（左/水平居中/右/顶/垂直居中/底）与批量删除；同样具备顶部翻转与防溢出保护。
- 数据自愈与清理：`sanitizeConnections` 在项目初次载入、历史回退、重做与剪贴板粘贴时自动过滤孤立连线与自环连接，保持画布图结构纯净。
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
- UI 画布：`apps/desktop/src/renderer/src/components/workflows/canvas/`（视口 `infinite-canvas.tsx`，编辑器 `canvas-editor.tsx`，悬浮条 `canvas-node-hover-toolbar.tsx`，选区条 `canvas-selection-toolbar.tsx`）
- DAG 转换器：`apps/desktop/src/renderer/src/components/workflows/lib/canvas-to-workflow-graph.ts`

## 已知坑

- **隐患**：崩溃恢复后取消找不到子 agent。根因：`childRuns` 是内存 Map；`insertRunStep` 不写 `childRunId`，也未调 `updateRunStepChildRunId`。正确做法：未接线前只 abort 仍在 Map 里的子 run；持久化再补写库 + `getWorkflow` 投影。
- 步骤支持 `dependsOn` 拓扑排序与 `layerWorkflowSteps` 分层。画布连线是编辑态 DAG；durable 执行仍严格串行。环在 `orderWorkflowSteps` 会被拒绝；前端 `canvasToWorkflowGraph` 会在提交前校验回路环与自环并拦截。
- `WorkflowStartInput.steps` 契约支持上限为 32 个节点；超量画布需拆分或提示。
- 画布节点拖动与点击对话框唤起：`useCanvasPointer` 在节点单击完成（`wasClick`）时必须主动 `setDialogNodeId(clickedNodeId)`，确保点击节点始终打开下方提示词面板；Node Header 严禁加 `e.stopPropagation()`，保证整卡拖拽连贯；卡片本体禁止加 `transition-all`（改为 `transition-shadow`），避免拖动过程产生 150ms 滞后跳变；拖拽高频计算经 `requestAnimationFrame` 缓冲。
- 画布节点曾把 `run.error` 收成固定英文 `Generation failed.`，真实原因（错档案、无字节、供应商原文）看不到。正确做法：`applyCanvasGenerationEvent` 把 `event.message` 写进 `errorDetails`。
- `executeKind` 曾无条件用设置页 `defaultImageModelId` 覆盖请求模型，画布选中 `grok-imagine-image` 也会被换成聊天默认生图模型；`requireProviderConfig` 只读当前激活档案，忽略 `GenerationRequest.providerId`。正确做法：image-only 请求原样使用；按 `providerId` 解析 vault。
- `workflow.lastCheckpointId` 是 `cp_<stepIndex>` 形式的 id，不是整份 checkpoint JSON（曾返回整个 JSON 字符串，已修）。
- 取消发生在步骤中途时，子 run 被 abort → 步骤抛错 → catch 里先看行状态是 `cancelled` 就直接返回，不会把 cancelled 覆写成 failed。
