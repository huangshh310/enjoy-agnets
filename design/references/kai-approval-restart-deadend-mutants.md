# kai approval-restart-deadend mutants

**defined=5 / killed=4 / survived=1（M5 封口由 abandon 其它路径完成，非本 PR 关键决策）**

关键决策：`endRestoredRunWithoutSdkReply` 在 emit `turn.todo` 同时 `persistTurnWorkflow(sid, turn)`，禁止侧栏 `in_progress` 死路；`needs_review` 粘性由 `shouldWriteSessionWorkflow` 守住。

| # | 位置 | 原 → 变 | 结果 |
|---|---|---|---|
| M1 | `restore-checkpoint-approval.ts` `endRestoredRunWithoutSdkReply` | 去掉 `persistTurnWorkflow(sid, turn)` | **killed**（工单仍 in_progress + 源码正则） |
| M2 | 同上 | `workflow: "todo"` → `"in_progress"` | **killed** |
| M3 | 同上 | `workflow: "todo"` → `"failed"` | **killed**（含 sticky needs_review 被错误覆盖） |
| M4 | 同上 | 去掉 `settlePendingApprovalsForRun(..., "restart")` | **killed**（Inbox 未清空） |
| M5 | 同上 | 去掉 `persistSealedAssistantTools` | **survived**（`restoreWaitingRuns` / sealAbandonedTools 另路径已封口；本 PR 不改封口入口） |

测跑：`apps/desktop` 下 Node 22 + `restore-waiting-restart.behavior.test.ts` + `restore-approval-workflow.behavior.test.ts`（13 pass 杀变异）。
