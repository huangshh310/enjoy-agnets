# P0 · Composer 铬条回归 — 产品短锁（紧急）

> 2026-09-20 · jojo  
> 触发：真机吐槽——模型列表无图标、多引擎无思考档、探索/执行切换消失  
> 嫌疑：I1 换模芯片 / 账本改动误伤 Composer 铬条  
> 预览：回写或合订 `design/previews/explore-execute-p0.html` + 新页 `design/previews/p0-composer-chrome.html`（图标·思考·模式同屏）  
> 【视觉真源】[`../previews/p0-composer-chrome.html`](../previews/p0-composer-chrome.html)  
> **插队**：高于 P0-S 接线；P0-S 预览可并行，实现让路本刀  
> **密度 / 布局**：与本文冲突时让路 [`p0-composer-slim.md`](./p0-composer-slim.md)（能力三件套、C1、思考按能力、图标真源不废）  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

Composer **底栏铬条必备三件套不丢**：（1）**探索 | 执行** 模式切换常在；（2）**思考档** 按能力出现；（3）引擎/模型 **图标真源** 必显。I1 只换模型 id，**不得拆**模式与思考入口。

---

## 1. 探索 / 执行（必须常在）

| 锁 | 内容 |
|----|------|
| 入口 | Composer **输入框上方或同行左侧** 分段控件：`探索` \| `执行`（文案跟人话，禁 Explore runtime 等词） |
| 真源 | 已有 `design/previews/explore-execute-p0.html` |
| 语义 | 探索=只读规划；执行=可写改文件/跑命令（内部 ask/plan ↔ agent） |
| 存活 | **每个**有 Composer 的会话都显示；不随 I1 换模、不随引擎 handoff 卸载 |
| 禁用 | 仅当引擎/能力明确不支持模式时：控件在，禁用 + 一句人话；**禁止整段消失** |

### C1 默认（jojo 续锁）

- **默认 C1**：分段在**所有引擎**的 Composer 上可见（对齐 `explore-execute-p0.html`）。
- 探索 = **宿主只读拦截**（拦写文件 / 磁盘 / 终端），**不依赖** CLI 原生 plan/ask。
- **仅当宿主确实拦不住写** 才回落 C2：分段仍在但**禁用** +「此助手暂不支持探索/执行切换」——**禁止整段消失**。

## 2. 思考档（按能力，不是按心情）

**出现规则**（`RuntimeCapabilities` / 模型 advertised）：

| 条件 | UI |
|------|-----|
| 当前引擎+模型声明 `thinking` / `reasoning_effort` / 等价档位 | Composer 显示 **思考** 芯片或档位菜单（如 关 / 低 / 中 / 高，或引擎回报的枚举） |
| 未声明 | **不画**思考控件（优于灰死按钮）；勿对全体引擎强行同一套 |

**必须有思考档的引擎族**（有 advertised 则必须露出；无 advertised 再藏）：

- Claude Code（含 extended thinking / effort 若 CLI 暴露）  
- Codex / OpenAI 系（reasoning effort）  
- Cursor Agent（若模型表带 thinking）  
- Gemini / Antigravity（若暴露 thinking）  
- DeepSeek / DSH（`reasoning_effort` 等）  
- 其他：以 capabilities 为准，**表驱动**，禁止写死「只有三家」

**按能力诚实（C 端）**

| 能力 | UI |
|------|-----|
| `thinking: "effort"`（Enjoy Local / 沙箱） | 已有五档思考条（关 / 低 / 中 / 高 / 最大） |
| `thinking: "model-id"`（Claude / Cursor / Antigravity / Gemini 等） | 人话入口：次级芯片「思考 · 跟模型」（或开/关）；点开带标注的本引擎模型表。**禁止**在无 effort API 的引擎上假画五档滑条 |
| `thinking: "none"` | **不画**思考控件 |

**禁止**：I1 模型菜单打开后盖住/卸掉思考档；换模后思考档不随新模型 capabilities 刷新。

## 3. 图标真源

| 面 | 真源 | 规则 |
|----|------|------|
| 引擎（导轨 / Picker / 芯片旁） | 应用内 **引擎品牌标**（既有 asset map；按 `runtimeId` / toolId） | 缺图 → 单字母色块 fallback，**禁止空白** |
| 模型列表行 | **引擎标**（同引擎列表统一）或模型族标（若有独立 asset）；名称 + 可选 meta | I1 弹出列表每一行都有标；不得只有文字秃列 |
| 尺寸 | 与既有 Picker 行高一致（约 16–20px） | 不引入新协议微标 |

## 4. Composer 铬条信息架构（锁顺序）

从左到右（可 wrap，不可删）：

1. **探索 \| 执行**  
2. **思考**（若 capabilities 有）  
3. 弹性空白 / 发送区  
4. **引擎**（可点，走既有 Picker/handoff，≠ I1）  
5. **模型芯片**（I1：同引擎换模；带图标）

脚注可保留：「同一助手，不换引擎」仅挂在模型切换成功态，不影响模式控件。

## 5. 回归范围（给 mike）

| 检查 | 期望 |
|------|------|
| I1 #50 前后 Composer | 模式切换仍在；思考档按引擎仍在；模型列表有图标 |
| M-D/G #55 | 只动账本/Sources，不应卸铬条；若误伤一并修 |
| 官方-only / Hermes / Amp | 无思考则藏；模式切换仍在（除非能力否） |

## 不做

- 借回归重做整页 Composer  
- 把模式塞进 I1 模型菜单里当隐藏项  
- 假思考档（无 capability 也显示可点成功）  
- worktree / 新 runtime  

## 验收

1. 任意常用引擎会话：一眼能切 **探索/执行**。  
2. Claude/Codex/DSH（或当前 advertised 带思考的模型）：能选思考档；换模后档位跟新模型刷新。  
3. I1 模型列表：每行有引擎/品牌图标，芯片上有标。  
4. 无思考能力的引擎：无思考控件，但模式切换仍在。

## Luna 一句话

`p0-composer-chrome.html`：同一 Composer 示意——左探索/执行、思考档、右引擎标+模型芯片列表（带图标）；另：无思考引擎态、I1 列表秃文字反例划掉。主屏 C1 全引擎露出；次卡 C2 禁用例外。

---

*插队实现；P0-S 短锁与预览不废，接线排本刀之后。*  
*能力冲突以 `design/specs/*` 为准；Composer 呈现密度以 [`p0-composer-slim.md`](./p0-composer-slim.md) 为准。*
