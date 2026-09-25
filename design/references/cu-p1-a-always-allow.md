# CU-P1-A · Always-allow 应用簿 — 产品短锁

> 2026-09-25 · jojo 短锁全文 + leo/host 已对齐项  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) G2；【视觉真源】[`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)  
> 基线 tip `63e5d8f`（CU-P1-R Dock 已合）· I3 Registry more-agents 仍停  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。  
> **write-through 待 host 拍板**，本文与 HTML 均不把任一侧写成最终 SoT。

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
6. 与 CU-P1-S 分层：见下命中顺序（已锁）与 write-through（未锁）。

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

## leo/host 已对齐（与 jojo 不冲突）

1. 卡上文案「始终允许此应用」映射决策名 **`allow_always`**。
2. **无稳 `appKey`**（无 bundleId / exe / AUMID / 规范化 appName）时 **隐藏**始终允许；只留允许一次 + 拒绝；本会话按现有规则（无键或 `bypassesSessionAllow` 也藏）。
3. 命中顺序：硬每次问（坐标 / 前台 / 敏感 / 二次确认）→ 会话表 → 持久簿 `desktopAlwaysAllowAppKeys`。
4. **禁画**永久 anyDesktop / 「任意桌面永久」进本名单；禁持久 `desktop_act:*`。
5. 只点「本会话允许此应用」**不写**持久簿（两侧都同意）。

---

## 待 host 拍板 · write-through

预览 HTML 黄框并列，**不锁死任一侧**。C 端先画四态 / 贴纸 / 反例 / A1–A6。

| 案 | 主张 |
|----|------|
| **jojo 钉** | `allow_always` 写持久簿，并写当前会话表同 `appKey`；设置「撤销」清持久 + 清当前会话同键。 |
| **leo via host** | `allow_always` **只**写持久簿；撤销只清簿，不管会话表。 |

接线前等 host 一句。未拍板前 kai 不要把双写或「只写簿」写进当前真相。

---

## 范围

- **在**：Enjoy Local · Execute · 现有 Permission Dock + 设置「电脑操控」卡 · 本预览 + 本文
- **不在**：产品 TS 本刀不改；不改名「本会话」；不做 I3；不做云同步；不做第二套遥控器

---

## Luna 一句话

Dock 第三项是本机贴纸；设置里能撕（按钮写「撤销」）。有稳 `appKey` 才贴得上。硬每次问的门，簿盖不住。write-through 先空着。

视觉真源：[`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)（四态 / 无键隐藏 / 名单+空态 / 反例划掉 / 黄框待拍板；不宣称应用已 1:1）。

---

*未落地前：视觉与设置文案以预览为准；write-through 以 host 拍板为准，不以本文任一侧为最终 SoT。落地后以 `design/specs/computer-use.md` 为准。*
