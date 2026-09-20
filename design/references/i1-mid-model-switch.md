# I1 · 同引擎中途换模型 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`emerging-agent-innovation.md` I1；【视觉真源】I1：[`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)  
> 引擎交接边界（当前真相）：[`../specs/m3-engine-handoff.md`](../specs/m3-engine-handoff.md)  
> 队列：M-CBD #47 已合 `28823d3` → **I1** 已合 #50 `5033c10`  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

在 **当前 Enjoy 会话、同一引擎** 内，Composer 模型芯片换 `modelId`；角标「已切换」。**不是** M3 引擎 handoff，**不**新开 Enjoy 会话，**不**写「换模会重开会话」。

---

## 与 M3 正交

| | I1 同引擎换模 | M3 引擎 handoff |
|----|---------------|-----------------|
| 切什么 | 同 `runtimeId` 的 `modelId` | `runtimeId` |
| Enjoy 会话 | 同一 `sessionId`，不新开、不重开 | 同一 `sessionId`；有历史才确认交接 |
| 入口 | Composer 模型芯片 | Rail / Picker / 设为主引擎 |
| C 端成功 | 「已切换」「已切换到 {model}」「同一助手，不换引擎」 | 「已交接 {from} → {to}」 |
| 禁止 | 「已切换引擎」「已交接」「换模会重开会话」「本机助手会话会重开」、handoff 卡 | 静默切引擎、假续跑 |

ACP 子进程可能 dispose 再 spawn `--model`，这是桥实现，**不是** Enjoy 会话重开，也不是 M3。C 端只写「下一轮才生效 / 同一助手，不换引擎」。

---

## 做

| 面 | 锁 |
|----|-----|
| 入口 | Composer **模型芯片**（或同行选择器）可点；列出**本引擎**可用模型 |
| 生效 | 下一轮 `session/prompt`（或等价）起用新模型；历史气泡保留旧模型标记 |
| 反馈 | 切换成功 → 角标/一行「已切换到 {model}」；失败 → 诚实原因（未登录/不支持/列表空） |
| 能力 | 仅 `RuntimeCapabilities` / 引擎 advertised models 内；官方-only 引擎跟其登录态 |
| 用量 | 仍走现 Usage L1–L4；不伪造跨引擎配额 |

## 不做

- **假 handoff**：换模型 ≠ 换引擎；不触发 M3 引擎切换/空会话迁移文案  
- **假重开会话**：不新开 Enjoy `sessionId`，不把 ACP 子进程 dispose 写成「会话会重开」  
- 同屏「换引擎」混进模型菜单（引擎切换仍走现有 picker / handoff）  
- 为对称塞 CLI 不认的旗标（如乱加 `--fast`）  
- 清会话、清上下文、自动 commit/push  
- worktree / 第二会话伪装切换  

## 与现有面关系

| 面 | 关系 |
|----|------|
| M3 引擎 handoff | **正交**；I1 不调用 handoff。边界见 [`../specs/m3-engine-handoff.md`](../specs/m3-engine-handoff.md) |
| Provider / vault 绑定 | 模型列表来自已绑定电源；官方-only 不假 BYOK |
| DSH 等特殊 spawn | 跟现有 `--patch` / advertised 模型路径，不另发明 |

## 验收

1. 同引擎会话中换模型后，下一条回复来自新模型（或引擎回报的 model id 可见）。  
2. UI 无「已切换引擎」「已交接」「换模会重开会话」类文案；无新 Enjoy session id。  
3. 不支持列表的引擎：芯片禁用或说明「此引擎不支持中途换模型」，不空操作成功。  

## Luna 一句话原型

Composer 底栏：模型芯片打开本引擎模型列表 → 选中后芯片文案变 + 淡入「已切换」；旁注小字「同一助手，不换引擎」。另给：不支持态、失败态各一屏。

视觉真源已入库：[`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)（默认 / 已切换 / 不支持 / 失败；不宣称应用已 1:1）。

---

*冲突以 `design/specs/*` 为准。*
