# I1 · 同引擎中途换模型 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`emerging-agent-innovation.md` I1；【视觉真源】I1：[`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)  
> 队列：M-CBD #47 已合 `28823d3` → **I1**  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

在 **当前会话、同一引擎（CLI）** 内，Composer 可换模型；角标「已切换」；**不**走引擎 handoff，**不**新开会话冒充切换。

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
- 同屏「换引擎」混进模型菜单（引擎切换仍走现有 picker / handoff）  
- 为对称塞 CLI 不认的旗标（如乱加 `--fast`）  
- 清会话、清上下文、自动 commit/push  
- worktree / 第二会话伪装切换  

## 与现有面关系

| 面 | 关系 |
|----|------|
| M3 引擎 handoff | **正交**；I1 不调用 handoff |
| Provider / vault 绑定 | 模型列表来自已绑定电源；官方-only 不假 BYOK |
| DSH 等特殊 spawn | 跟现有 `--patch` / advertised 模型路径，不另发明 |

## 验收

1. 同引擎会话中换模型后，下一条回复来自新模型（或引擎回报的 model id 可见）。  
2. UI 无「已切换引擎」类文案；无新会话 id。  
3. 不支持列表的引擎：芯片禁用或说明「此引擎不支持中途换模型」，不空操作成功。  

## Luna 一句话原型

Composer 底栏：模型芯片打开本引擎模型列表 → 选中后芯片文案变 + 淡入「已切换」；旁注小字「同一助手，不换引擎」。另给：不支持态、失败态各一屏。

视觉真源已入库：[`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)（默认 / 已切换 / 不支持 / 失败；不宣称应用已 1:1）。

---

*冲突以 `design/specs/*` 为准。*
