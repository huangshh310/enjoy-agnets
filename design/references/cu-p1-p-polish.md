# CU-P1-P · CU 体感打磨 — 产品短锁

> 2026-10-09 · jojo 短锁（用户已拍板）· Luna 预览钉视觉 · 基 main `1893fa5`  
> Owner luna 预览 → kai（敏感真源 IPC、通知层状态推导）→ mike（卡/空态/通知文案铬）· I3 仍停  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。  
> 【视觉真源】[`../previews/cu-p1-p-polish.html`](../previews/cu-p1-p-polish.html)

---

## 一句话

审批卡默认收紧到「本会话允许此应用」，空态给出真实可用的桌面示例，系统通知说人话且不泄露输入。

## Do

1. **审批默认值（改 CU-P1-A 锁，用户已批）**：有稳 appKey 时默认选中「本会话允许此应用」；「始终允许此应用」保留但不突出（不加粗、无蓝环、非默认）；无稳 appKey 仍隐藏始终允许。同步改 `cu-p1-a-always-allow.md` 默认值描述。
2. **敏感应用**：以 main `desktopActIsSensitive` 为真源下发；命中时卡上一行警示 + 隐藏始终允许。警示是提醒，不得写成「已拦截」。
3. **空态桌面示例**：CU 已开且权限就绪时增一条「@{应用} 帮我在 {应用} 里…」，应用名取自 `use-desktop-mention-apps` 真实数据；未开/未授权/无就绪应用时不显示。
4. **人话通知**：待审批「Enjoy 想在「{应用名}」里{动作类型}，回 Enjoy 审批」；结束区分「已完成 / 已停止 / 出错」（通知层从现有 end/error 推出）；只含应用名 + 动作类型。

## Don’t

新增审批决策枚举 · renderer 自写敏感名单 · 改 `run.end` 契约或让 abort 发 `run.end` · 通知里出现 `type` 文本/敏感控件名/「允许」按钮 · 空态写死或虚构应用名 · 任何自动放行

## 验收 P1–P6

- **P1** 普通应用（稳 appKey）：默认选中「本会话」，始终允许可见不突出
- **P2** 敏感命中：有警示、无始终允许；renderer 无独立名单
- **P3** CU 就绪：空态出现真实应用名示例；未就绪不出现
- **P4** 待审批通知含应用名+动作类型，不含输入文本/敏感控件名/允许按钮
- **P5** 正常结束→已完成，用户停→已停止，错误→出错；`run.end` 契约不变
- **P6** `cu-p1-a-always-allow.md` 与测试同步改默认值（本预览 PR 只改 md；测试归 mike/kai）

## Luna 一句

「先给小钥匙，大钥匙放在一旁；通知只说在哪、做什么，不说你打了什么。」

---

## 对照 main `1893fa5` 的代码真源（本预览不改 `apps/` / `packages/`）

读过再画。以下是 **现在代码**，不是本锁落地后的样子。

### 审批默认 = 始终允许（将改）

`desktop-approval-choice.ts` 注释写「预览锁定：有稳键时默认高亮第三项」。`defaultDesktopApprovalChoice`：`available` 含 `allow_always` 就返回它，否则 `allow`。

`desktop-approval-choices.tsx`：`featured={id === "allow_always"}`。选中且 featured 时蓝边 + `ring-accent`；featured 行标题 `font-semibold`。文案跟 i18n，不要另造：

| id | zh（`zh/chat.ts`） | testid |
|----|-------------------|--------|
| `allow` | 允许一次 | `approval-allow` |
| `allow_session` | 本会话允许「{app}」（通用名「本会话允许此应用」） | `approval-session` |
| `allow_always` | 始终允许「{app}」（通用名「始终允许此应用」） | `approval-always-app` |
| `deny` | 拒绝 | `approval-deny` |

附：`desktopAllowAlwaysHint` = 「本机名单 · 可随时在设置撤销」。标题 `desktopApprovalTitle` = 「允许操控「{app}」？」。TTL `desktopApprovalTtlFrozen` = 「待批中 · 本观察 TTL 已冻结（§3.2a）」。Dock 标签 `attention.dockLabel` = 「等待你的决定」。底栏「继续」。

四选一枚举不新增。Permission Dock 仍是 `permission-dock.tsx` 唯一决策面，把 `allow` / `deny` / `allow_session` / `allow_always` 交给 `decidePendingApproval`。

### 敏感：main 名单，renderer 已引用，但始终允许仍露出

真源 `packages/agent-core/src/computer-use/desktop-act-app-key.ts` → `desktopActIsSensitive`。`SENSITIVE` 子串：`system settings` / `system preferences` / `系统设置` / `系统偏好设置` / `keychain` / `钥匙串` / `wallet` / `password` / `密码` / `payment` / `支付` / `alipay` / `wechat pay`。**「终端 / Terminal」不在名单**。预览敏感态画「系统设置」，不把终端画成已命中。

`desktop-act-policy.ts`：`desktopActAlwaysAsks` = 坐标/前台 **或** 敏感 **或** 二次确认。会话表与持久簿都盖不住。

`desktop-approval-args.ts`（renderer 只 **调用** core，不自写名单）：

- `canSessionAllow`：有 appKey、非 bypass、**且非** `desktopActIsSensitive` → 敏感时本会话项已隐藏
- `canAlwaysAllow`：非二次确认 + `isStableDesktopAppKey` → **敏感时始终允许仍可见**，且被当成默认

本锁：敏感再藏始终允许 + 一行提醒（不是「已拦截」）。敏感 **不会** 自动走二次确认；二次确认仍是 CU-P1-R 并排卡（`needs_second_confirm` / 弱身份），底栏确认/取消，不露始终允许。

### 空态：三条代码 pill，无桌面示例

`empty-state-constants.ts` + `empty-state-pills.tsx` 只有：审查改动 / 编写单测 / 优化重构。没有 CU 门、没有 `@应用`。

`use-desktop-mention-apps.ts`：CU 关或无 IDE → 空列表；`desktopListApps` 成功才记住 `displayName` + 稳 `appKey`；失败不造假应用。空态示例必须吃这份名单，禁止写死「备忘录」。预览里的「备忘录」只是示意 `displayName`，落地时换成当时列表里的真实名。

### 通知：泛工具句；abort 不发 `run.end`；`run.error` 不弹

`desktop-notify.ts`：

- `approval.required` → 标题「待审批」· 正文「有工具在等你决定。」（无应用名、无动作）
- `run.end` → 标题「任务完成」· 正文「这一轮已经结束。」
- **不处理** `run.error`

`stream-event.ts`：`run.end` 只有 `runId` + envelope；`run.error` 另有 `message`。`claim-run-end.ts`：`shouldEmitRunEnd` 在 `aborted` / `timedOut` / `userCancelled` 时为 false。`abortAgent` 发 `run.error` + `USER_ABORT_MESSAGE`（`Aborted by user.`），**不**发 `run.end`。

因此：**用户停现在不会被通知成「完成」**——它根本不走 `run.end`，而 notify 又忽略 `run.error`，所以停和出错都静默。本锁要通知层从现有 end/error **推导**「已完成 / 已停止 / 出错」，禁止改 `run.end` 契约、禁止 abort 改发 `run.end`。

动作类型取自执行器粗类（`click` / `type` / `scroll` / `key` / `move` / `drag`；`wait` 不审批）：人话「点击 / 输入 / 滚动 / 按键 / 移动 / 拖拽」。通知只说应用名 + 这类动词，不写 `type` 字段原文、不写控件名、不写用户输入、不带「允许」按钮。

---

## 范围

- **在**：本预览 + 本文 + `cu-p1-a-always-allow.md` 默认值一句；CU-P1-A HTML 只加「新 SoT 在 P」横幅，不重画
- **不在**：`apps/` · `packages/` · 测试 · Registry · I3 · 新决策枚举 · `run.end` 改形

未落地前：视觉与文案以预览 + 本文为准。落地后以 `design/specs/computer-use.md` / `ipc` / `m2-attention` 为准。
