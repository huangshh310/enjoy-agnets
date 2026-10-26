# 审批等待中重启死路 + 检查器状态 · kai 审计 / 修法

> tip base: `c92dfd8f` (= origin/main at start) · branch `kai/approval-restart-deadend` · worktree `/workspace/enjoy-wt/kai-approval-restart`
> 不碰 #180（`kai/base-p0-1-honesty`）；#138 热修重启已合。

## 现象（死路）

1. 一轮停在**审批闸**（工具审批 / permission dock / 二次确认同类 `waiting_review`）时杀进程或重启。
2. 回挂对不上（无检查点 / HMAC 失败 / 无签参 / 异常）走 `abandonWaitingRestore` → `endRestoredRunWithoutSdkReply`：
   - run → `cancelled` + `restore_no_matching_approval` ✓
   - 未决审批 → `cancelled(restart)` ✓
   - 工具行封口 `restart_abandoned` ✓
   - 推 `run.error` 带 `turn: { workflow: "todo", attention: "neutral" }` ✓
3. **但库里 `sessions.workflow_status` 仍是开跑时写的 `in_progress`** → 侧栏「进行中」分组 / 状态徽章永不散；刷新会话列表又从库抄回 `in_progress`。这是重启后**无 UI 恢复路径的死路**（不是可再拍板的活审批）。
4. 检查器：`toolRunKind("approval-requested")` → `"running"`（「进行中」）。封口后应是 `"restart"`。main 封口与冷启动 `sealAbandoned: !running` 已有；工单态不落库时侧栏与检查器顶栏「运行中」语义仍会和「进程已没了」打架。

## 主线已有（本 PR 不重做）

| 项 | 证据 |
|----|------|
| #138 回挂可决策卡 / kill-9 fail-closed / 无检查点结清 | `restore-waiting-runs.ts` + `restore-waiting-restart.behavior.test.ts` + e2e `approval-restart*` |
| 扫尾：回挂完仍 `waiting_review` 且无 ActiveRun → abandon | `sweepUnrestoredWaiting` |
| running 孤儿中性结清并**落库** workflow | `queueInterruptedRunningSettle` → `persistSessionWorkflow` |
| 冷启动回灌：不在跑则封口 approval-requested | `session-hydrate.ts` `sealAbandoned: !running` |
| 活审批回挂 + Inbox 活行 | `restoreHeldWaitingApprovals` / `listLivePendingApprovals` / `hydrate-live-pending-approval` |

## 根因（call sites）

| # | 文件:行 | 问题 |
|---|---------|------|
| A | `restore-checkpoint-approval.ts` `endRestoredRunWithoutSdkReply` (~141–170) | 只 `emitEvent(... turn: todo)`，**不** `persistTurnWorkflow` / `persistSessionWorkflow`。对照 `restore-interrupted-running.ts:47` 会落库。 |
| B | （连带）侧栏 `sidebar-status-groups` / `session-workflow` 读库 `workflow_status` | 库不改则永远「进行中」；renderer 本地若收到 turn 会暂时变 todo，重载又回滚。 |
| C | 检查器 `thread-run-slice.ts` `toolRunKind` | `approval-requested`→running 是活闸语义；死闸必须靠封口码。本 PR 用行为测锁「abandon 后工具行 + 工单」一致，不改映射表。 |

## 明确不是本 PR

- #180 缺 turn 的 `run.error`→todo（renderer `review-gate-phase`）：并行，不碰该分支。本路径 **有 turn**，renderer 已信 main；缺的是 **main 落库**。
- soft 7 / #169 后续：旧版「停止后残留 waiting_review + decision=null」启动时会被当真审批回挂——无可靠标记，不在本范围。
- 回挂**成功**的可决策卡（HMAC+检查点+签参）：应继续挂卡，不是死路。

## 修法（最小诚实 / 可恢复）

1. `endRestoredRunWithoutSdkReply`：在封口 / 结清之后、`emitEvent` 之前，对 `sid` 调用 `persistTurnWorkflow(sid, turn)`，`turn` 与事件一致（`workflow: "todo", attention: "neutral"`）。`needs_review` 粘性由 `shouldWriteSessionWorkflow` 守住（不误擦待验收）。
2. 行为测：模拟重启无检查点 abandon → `sessions.workflow_status === "todo"`（对照：开跑曾为 `in_progress`）；工具行带 `restart_abandoned` → `toolRunKind` 为 `restart`；Inbox 无活未决。
3. 变异：去掉 `persistTurnWorkflow` / 改写成不写库 / turn 仍写 `in_progress` 必须被测杀掉。

## 不做

- 不启 Enjoy / 不上本机 e2e
- 不改 #180 分支、不碰 soft 7 启动猜清洗
- 不改活审批回挂成功路径的 `waiting_review` 语义

## 落地状态

- 已在 `endRestoredRunWithoutSdkReply` 补 `persistTurnWorkflow(sid, turn)`（`todo`/`neutral`），与 `run.error` 事件 turn 对齐。
- 行为测：`restore-waiting-restart.behavior.test.ts`（nocheck 落库 + sticky）+ `restore-approval-workflow.behavior.test.ts`（abandon 工单/封口/源码正则）。
- 变异：见 `/workspace/enjoy-docs/kai-approval-restart-deadend-mutants.md`（4 killed / 1 survived 非关键决策）。
