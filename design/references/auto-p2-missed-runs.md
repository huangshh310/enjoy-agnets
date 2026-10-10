# AUTO-P2 · 自动化错过运行诚实化 — 产品短锁

> 2026-10-09 · jojo 短锁 Top5 ② · Luna 预览钉视觉 · 基 main `cb882a52` · 实现等 ① 合完 · Owner luna 预览 → kai（检测、幂等键、跳过存储、补跑授权隔离）→ mike（行状态/标签/抽屉开关铬）· I3 仍停 · 落地以 `design/specs/*` 为准
>
> 对照：[`ai-trends-oss-enjoy.md`](./ai-trends-oss-enjoy.md) Top5 ② / T6；I4 壳 [`i4-automations.md`](./i4-automations.md) · [`i4-p1-webhook-onsave.md`](./i4-p1-webhook-onsave.md)
> 预览：[`../previews/auto-p2-missed-runs.html`](../previews/auto-p2-missed-runs.html)（【视觉真源】AUTO-P2 · Luna）
> 入库：`design/references/auto-p2-missed-runs.md`
> 队列：实现等 ①（CU 体感打磨 / CU-P1-P）合完再接线；本刀只锁视觉与文案
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。不碰 Registry / I3。

---

## 一句话

电脑睡着、应用没开或上一次还没跑完而错过的定时，不再静默消失：记一条「已跳过」和原因；用户可选补跑最近一次，默认关。

---

## 当前真相对照（2026-10-09 · 基 `cb882a52`）

对照实码，不是愿景。实现时以届时 `design/specs/settings.md` 为准。

| 面 | 今天实际 |
|----|----------|
| 列表「上次」 | 有。次行写 `上次 · {今天/昨天/本周「周X」/上周「上周X」 时分}`（周从周一起算），从未跑写「尚未运行」，运行中写「本轮已开 · 会话列表可见」（`studio.automations.lastRun` / `neverRun` / `roundOpened`；`automation-row.tsx` + `last-run-label.ts`）。错过 N 只数 skipped；最新成功补跑与折叠条同一句「上次」，不写「错过」 |
| 行状态胶囊 | 只有 **空闲 / 运行中 / 失败**。`lastRunStatus` 合约是 `ok \| failed \| running`（`packages/ipc-contract/src/automations.ts`）。**没有** 已跳过 / 错过 / 补跑 |
| 错过 / 跳过概念 | **无 C 端面、无存储。** 调度注释写死「退出即停，不补错过的点」（`automations-scheduler.ts`）；cron「错过的小时不补。running / 同一分钟已开则跳过」（`automations-cron.ts` `shouldFireCron`）——跳过是静默不发，不落记录。settings 已知坑与能力文案仍是「错过的点不补跑」「关掉应用不会补跑」 |
| 运行记录 | **没有**抽屉内历史列表。持久化只有 `lastRunAt` / `lastRunStatus` / 可选 `lastSessionId` |
| 补跑开关 | **没有**。「立即运行」只在触发=仅手动时出现 |
| 幂等 | `runAgent` 带 `commandId: createId("auto-run")`（`automations-launch.ts`）——**每次开一轮新随机 id**，用来防同一 turn 双开，**不是**「自动化 id + 计划时间」的错过点键。无 `powerMonitor` 唤醒回看 |
| Approval Dock | 现网 `permission-dock.tsx` 标题「等待你的决定」；桌面卡四选一：允许一次 / 本会话允许此应用 / 始终允许此应用 / 拒绝。现码默认仍高亮「始终允许」（`defaultDesktopApprovalChoice` → `allow_always`）。① 视觉真源 [`cu-p1-p-polish.html`](../previews/cu-p1-p-polish.html) 已把默认改成「本会话允许此应用」。**终端已进敏感名单**（#105 / `desktopActIsSensitive`），不能画成普通应用默认「本会话」。本预览 E 主例用非敏感「备忘录」+ 自动化「晨间待办整理」；旁卡「终端」补跑对齐 CU-P1-P 状态 B（警示「这是敏感应用，每次都会问你」、默认允许一次、本会话 / 始终允许不显示） |
| 通知 | `desktop-notify.ts` 审批通称「待审批 / 有工具在等你决定。」**无**自动化补跑来源句，通知上 **无**允许按钮（现网也没有） |
| Token | 本预览用 Agents ink `#0F1419` / mute `#5C6670` / line `#E4E7EB` / paper `#F7F8FA` / card `#FFFFFF` / accent `#2B6DE5`。I4 / I4-P1 预览仍是旅行纸色 Paper/Clay，**不要**把那套色抄回来 |

---

## Do

1. 启动和系统唤醒（`powerMonitor`）时计算错过的计划点，回看上限 7 天。
2. 每个错过点写一条 `skipped`，原因三选一：电脑睡眠 / 应用未运行 / 上次仍在运行。记录**只存本机**。
3. 列表行与「上次运行」标签显示「已跳过 · 原因 · 时间」（mute 小字，替换「上次 ·」）；连续错过合并为「错过 N 次」，不刷屏。**N 只数 skipped，成功补跑不算进 N。** 最新一条运行是成功补跑时，列表次行与抽屉折叠条必须写「上次 · {when}」，**禁止用「错过」开头**。人话日期按日历周（周一起算）：本周「周X」，上周「上周X」；今天 / 昨天仍优先。2–6 天前若仍在本周，不得写成「上周X」。**名称旁不再挂重复的「已跳过 / 错过 N 次」小标。**
4. 每条自动化一个开关「错过后补跑最近一次」，**默认关**；开时只补最近一个点，较早的只记跳过。
5. **幂等键**：自动化 id + 计划时间（参照 `commandId`）；多次唤醒/启动对同一点只补一次、只记一条。
6. 补跑与手动运行同一条审批链；需要审批时停在 Approval Dock 并发人话通知。
7. **补跑不继承桌面授权**：不继承 `desktop_act:*`（本会话任意桌面）；按应用的本会话放行与始终允许簿照常。

C 端只写「已跳过 / 电脑睡眠 / 应用未运行 / 上次仍在运行 / 补跑」。`skipped`、`powerMonitor`、`commandId`、`desktop_act:*` 只进说明与交接，不上界面。

### 错过摘要（jojo 复检锁）

列表次行与抽屉折叠条必须同一句（`lastRunLine` / `missedGroupSummary`）。

| 记录 | 文案 |
|------|------|
| 只有 skipped | 1 条：「已跳过 · 原因 · 时间」；≥2 条同因：「错过 N 次 · 原因 · 时间」；混因：「错过 N 次 · 最近 原因 · 时间」 |
| skipped 中间夹成功补跑 | N **只数 skipped**（例：skip / catch-up ok / skip →「错过 2 次」不是 3） |
| 最新一条是成功补跑 | 写「上次 · {when}」，**不要**用「错过」开头（例：「午间 diff 复盘」补跑成功 + 一条跳过） |

日期：`last-run-label.ts` 周从周一起算。本周「周X」，上周「上周X」。

---

## Don’t

- 默认补跑或一次补多个历史点
- 补跑绕审批 / 继承任意桌面 / 自动点允许
- 跳过记录上云
- 为准点加常驻后台 / 开机自启 / 阻止睡眠
- 跳过写成失败、补跑写成准点成功
- 把终端画成普通应用默认「本会话允许」（终端已进敏感名单，见 #105）

---

## 验收 M1–M6

- **M1** 睡过计划点 → 唤醒后「已跳过 · 电脑睡眠 · 时间」；补跑关时不运行
- **M2** 应用关闭期间错过 →「应用未运行」；上一次仍在跑 →「上次仍在运行」
- **M3** 补跑开：只补最近一个，较早点只记跳过；运行记录标「补跑」
- **M4** 多次唤醒/启动，同一点只补一次、只一条记录
- **M5** 补跑要审批时停 Dock 并通知；任意桌面放行对补跑无效，按应用放行和簿照常。非敏感（如备忘录）默认本会话、始终允许可见不突出；敏感（终端）警示 + 默认允许一次，本会话 / 始终允许不显示
- **M6** 跳过记录仅本机；回看 ≤ 7 天

---

## Luna 一句

「错过就说错过」——次行一句安静的「已跳过 · 原因 · 时间」，点开说清为什么；补跑是抽屉里默认关的开关，不是一键补齐历史。

---

## 切片与边界

| 项 | 锁 |
|----|-----|
| 视觉 / 文案 | 本预览（Agents token，沿 I4 列表 / 380px 抽屉铬） |
| 检测与存储 | kai：启动 + `powerMonitor` resume；7 天回看；幂等键 `automationId + scheduledAt`；本机 skipped store；补跑走现 `automations-run` / 同一审批链；不继承 `desktop_act:*` |
| 行 / 抽屉 / Dock | mike：次行「已跳过 · 原因 · 时间」与合并「错过 N 次」（名称旁不重复小标）；抽屉开关默认关；运行记录「补跑」标；Dock 来源句；通知文案。E 主例备忘录 / 「晨间待办整理」；终端补跑走敏感旁卡 |
| 不做 | I3 / Registry / 云调度 / 开机自启 / 常驻后台；终端当普通应用默认本会话 |
| 等 | ① CU 体感打磨合完再接线（Dock 默认「本会话允许此应用」；敏感名单含终端，#105） |

---

*冲突以 `design/specs/*` 为准。未落地前：视觉与文案以预览 + 本文为准。落地后回写 settings / ipc 当前真相。不宣称应用已 1:1。*
