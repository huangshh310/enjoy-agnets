# CU-P1-B · Composer `@桌面` / `@应用` — 产品短锁

> 2026-09-25 · jojo 短锁全文  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) CU-P1-B / Codex `@Computer`/`@App`；【视觉真源】[`../previews/cu-p1-b-composer-mention.html`](../previews/cu-p1-b-composer-mention.html)  
> 基线 tip `281520e`（CU-P0-C overlay 已合）· I3 Registry more-agents 仍停  
> Owner：luna 预览 → mike → kai（list / bias 挂点薄）  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

Composer 提及 `@桌面` / `@应用名` 偏置宿主 `desktop_*`，对标 Codex `@Computer`/`@App`；非插件店，不跳过审批。

---

## 做

1. `@桌面`：Execute 下偏置桌面工具总入口（选用 `desktop_*`）。
2. `@应用名`：点名本机可枚举应用（与 `desktop_list_apps` 同源或等价），展示名 + 稳 `appKey`；提及后偏置该应用。
3. 全链路仍走闸：Approval Dock / 会话表 / Always-allow / 二次确认 / overlay；提及 ≠ 放行。
4. Explore 人话：提及 `@桌面` 或 `@应用` 时 **不**注册 `desktop_*`；Composer/能力轨提示：「桌面控制需切换到执行」（或等价）；勿静默失败、勿装已连接。
5. 无稳 `appKey` 的项：可出现在提及候选，但 **不**露出「始终允许」路径。

## 不做

- Registry / 插件店 / 虚构未装应用
- 提及 = 跳过审批或裸 `desktop_act:*` 永允
- 第二套远程壳
- Explore 下点亮 overlay 或注册桌面工具

---

## 验收 B1–B4

- **B1**：Execute + `@桌面` → 偏 `desktop_*`；首次 act 仍进 Dock（除非会话/簿已放行）
- **B2**：Execute + `@计算器`（名单内）→ 偏该 appKey；点别的 app 仍按 §3.2b 再批
- **B3**：Explore + `@桌面` → 无 `desktop_*` + 可见「需切换到执行」人话
- **B4**：候选无假应用；无稳 key 不走始终允许

---

## 范围

- **在**：Enjoy Local · Composer 提及芯片 / `@` 候选 · Execute 偏置 `desktop_*` 或具名 `appKey` · Explore 诚实条 · 本预览 + 本文
- **不在**：产品 TS / Permission Dock / Registry / I3 本刀不改；不做插件店；不做第二套遥控器；不宣称应用已 1:1
- **文案钉**：产品锁写 **`@桌面`**，不要沿用旧预览 `p0-computer-use` 的 `@电脑`

Owner：luna 预览 → mike → kai（list / bias 挂点薄）。I3 Registry more-agents 仍停。

---

## Luna 一句话

「对他说桌面，而不是教他工具名」：Composer 一提 `@桌面/@应用`，Execute 里偏置 CU；Explore 只说要切执行——仍是 Enjoy 提及，不是 Codex 插件市场。

视觉真源：[`../previews/cu-p1-b-composer-mention.html`](../previews/cu-p1-b-composer-mention.html)（A Execute `@桌面` / B `@应用` 候选 / C Explore 诚实 / D 无稳 key / 反例划掉；不宣称应用已 1:1）。

---

*未落地前：视觉与文案以预览 + 本文为准。落地后以 `design/specs/computer-use.md` 为准。*
