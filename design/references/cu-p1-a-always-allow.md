# CU-P1-A · Always-allow 应用簿 — 产品短锁

> 2026-09-25 · jojo 短锁全文（host 确认：始终允许只写持久簿）  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) G2；【视觉真源】[`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)  
> 基线 tip `63e5d8f`（CU-P1-R Dock 已合）· I3 Registry more-agents 仍停  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话（jojo）

Settings 可撤销的**本机**按应用持久允许簿；审批卡增加「始终允许此应用」。对标 Codex Always allow，补 G2。不与「本会话」/ `anyDesktopSession` 混为一谈。

真源句：「设置里的可撕应用贴纸」。

---

## 做（jojo 短锁）

1. Dock 四态（**非新壳**）：允许一次 · 本会话允许此应用 · **始终允许此应用** · 拒绝。有稳 `appKey` 时突出第三项。
2. 设置「始终允许的应用」：名单（应用名 + `appKey` 摘要）+ 一键「撤销」；空态；撤销立即更新列表。
3. 键 §3.2b：`bundleId` → `exe` / AUMID → 规范化 `appName`；**pid 不得单独作键**。
4. 覆盖：同 `appKey` 的 click / type / key；`wait` 免批。
5. 持久：跨会话 / 重启直至撤销；本机 only，禁云同步。
6. 与 CU-P1-S 分层：见下「各写各的」。

## 不做 / Hard（jojo）

- 裸 `desktop_act` / 「任意桌面永久」
- 持久簿写入 `desktop_act:*`（禁止永久 anyDesktop）
- 坐标 / `allowForeground` 因始终允许跳过 — 仍每次问
- 敏感窗在簿仍每次问
- Explore 不注册
- 非 Registry / 云策略
- **不跳过** `needs_second_confirm` / §3.2a
- pid 当键
- 无稳 `appKey` 仍露出「始终允许此应用」
- 与「本会话」糊成一种
- `allow_always` 同时写会话表；设置「撤销」顺手清会话表

---

## 设置文案钉（jojo · 已锁）

| 面 | 锁 |
|----|-----|
| 标题 | 「始终允许的应用」 |
| 一行说明 | 必须含「坐标/前台/敏感仍每次问」；贴纸隐喻可留在说明，不进按钮 |
| 行按钮 | 「撤销」（不要写撕掉 / 移除 / 删除 / Forget） |
| 空态 | 「还没有始终允许的应用…」；可补「在审批卡选「始终允许此应用」后会出现在这里」 |
| 脚注 | 「本会话允许」只活在当前对话，不在本页 |

---

## 验收 A1–A6（jojo 正式版）

- **A1**：始终允许 X 后 → 关会话 / 重启 / 新聊天再对 X 的 AX click·type·key → 不再弹普通审批
- **A2**：簿有 X、对 Y → 必须再批
- **A3**：设置撤销 X → 下一击再批；列表立即更新
- **A4**：坐标 / 前台 → 在簿仍每次 Dock
- **A5**：敏感窗 → 在簿仍每次问
- **A6**：stale 二次确认不因 Always-allow 静默 click

---

## 各写各的（已锁）

| 动作 | 只写 / 只清 | 不碰 |
|------|-------------|------|
| 卡决策 `allow_always`（文案「始终允许此应用」） | 只把该 `appKey` 写入持久簿 `desktopAlwaysAllowAppKeys` | 不写会话表 |
| 「本会话允许此应用」 | 只写 `conversationDesktopAllow` / 当前 session 表 | 不升持久簿 |
| 设置「撤销」 | 只从持久簿删该键 | 不清会话表。若用户另外点过本会话，会话键由 CU-P1-S 单独管理 |

无稳 `appKey`（无 bundleId / exe / AUMID / 规范化 appName）：**整项隐藏**始终允许；只留允许一次 + 拒绝；本会话按现有规则（无键或 `bypassesSessionAllow` 也藏）。不要用 pid 凑键。

命中顺序：**硬每次问**（坐标 / 前台 / 敏感 / 二次确认）→ **会话表** → **持久簿** `desktopAlwaysAllowAppKeys`。当前对话若已有会话命中，不必再靠簿；簿负责跨会话 / 重启。禁持久 `desktop_act:*`。

---

## 范围

- **在**：Enjoy Local · Execute · 现有 Permission Dock + 设置「电脑操控」卡 · 本预览 + 本文
- **不在**：产品 TS 本刀不改；不改名「本会话」；不做 I3；不做云同步；不做第二套遥控器

---

## Luna 一句话

Dock 第三项是本机贴纸；设置里能撕（按钮写「撤销」）。有稳 `appKey` 才贴得上。始终允许只写簿，本会话只写表，撤销只清簿。硬每次问的门，簿盖不住。

视觉真源：[`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)（四态 / 无键隐藏 / 名单+空态 / 反例划掉；不宣称应用已 1:1）。

---

*未落地前：视觉、设置文案与写入规则以预览 + 本文为准。落地后以 `design/specs/computer-use.md` 为准。*
