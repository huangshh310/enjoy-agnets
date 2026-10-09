# COST-P3 · 模型单价 + 估算成本 — 产品短锁

> 2026-10-09 · jojo 短锁 Top5 ③ · Luna 预览钉视觉 · 基 main `cd48767d` · Owner luna 预览 → kai（快照、匹配、计算、档案字段、IPC）→ mike（用量行、meter、trace、设置栏）· I3 仍停 · 落地以 design/specs/* 为准
>
> 产品短锁原文对照基线：main `cc718fb`（本稿从**当前** main `cd48767d` 起笔，下面「当前真相对照」以该 SHA 实码为准）。
> 对照：[`ai-trends-oss-enjoy.md`](./ai-trends-oss-enjoy.md) Top5 ③ / kai ★1
> 预览：[`../previews/cost-p3-estimated-cost.html`](../previews/cost-p3-estimated-cost.html)（【视觉真源】COST-P3 · Luna）
> 入库：`design/references/cost-p3-estimated-cost.md`
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。不碰 Registry / I3。不碰 `apps/` / `packages/` / tests。
> Token：Agents ink `#0F1419` / mute `#5C6670` / line `#E4E7EB` / paper `#F7F8FA` / card `#FFFFFF` / accent `#2B6DE5`（及现有 warn / danger / ok）。**不要**抄 Enjoy 旅行纸色 Paper/Clay（`m-d-g-ledger-sources.html` 那套旧预览色）。

---

## 一句话

Enjoy Local 每次运行按模型单价算出一个**估算**花费；价格不知道就显示「—」，不写 $0.00、不猜。

---

## 范围

- **算**：Enjoy Local 里走 API key / 自定义端点的模型。
- **不算**：外置 ACP 引擎（Codex CLI、Claude Code 等）。自己上报了花费就原样显示并注明来源；没上报不显示。订阅制额度不折算美元。
- **本地模型**（Ollama、LM Studio）：「本地 · 不计费」，不显示 $0.00。

---

## 当前真相对照（2026-10-09 · 基 `cd48767d`）

对照实码，不是愿景。实现时以届时 `design/specs/observability.md` / `providers.md` / `ui.md` / `m1-usage-and-capabilities.md` / `ipc.md` 为准。预览页上的金额都是**示例数字**，不是 models.dev 真价，也不是现网数据。

### 本轮账本用量行（run ledger）

| 面 | 今天实际 |
|----|----------|
| 组件 | `ai-chat/run-ledger/run-ledger-row.tsx` → `UsageRow`；`data-kind="usage"`；底边钉在 `run-ledger-rail.tsx` 的 `border-t` 下，**不进**读/改/命令/错误组 |
| 文案 | i18n `sessionOps.ledgerUsageTokens` = 「本轮 {n} tokens」。组名「用量」只给 sheet，rail 底边不画组头 |
| Token 格式 | 行内自有 `formatTokenCount`：`<1000` 原样；否则 `Xk`（`<10k` 一位小数，去尾 `.0`）。**不是** SessionMeter 用的 `formatTokens`（那套有 `1M`） |
| 收集 | `collect-run-ledger.ts` 第二参 `usageTokens`：`null` / `≤0` 不追加。`RunLedgerEntry` 只有 `title: String(tokens)`，**无**花费 / 来源 / 分项字段 |
| **现网接线** | `RunLedgerRail` 调 `collectRunLedger(assistant)`，**不传** `usageTokens`。`chat-stage` / `ai-chat-thread` 同样只用来判断「有没有工具行」。用量行铬条在、**现网 rail 画不出来**。spec `ui.md` 写「用量有真实 token 才钉在底边；本轮未存 `usage.updated` 就不画」——事件在，rail 没吃 |
| 现网 chrome | 约 `18.25rem` 右栏；顶「本轮账本」`caption-1-semibold`；次行摘要「改了 N 个文件，跑过 N 条命令」；组头 `caption-2-medium` + 右对齐数字；文件行类型微标 + 文件名，组内不再写「改 ·」；命令 `$` + 摘要 + 通过/失败。**不要**按 `m-d-g-ledger-sources.html` 的旅行纸色 / 「读 · 文件名」旧稿画 |

### session-meter 悬停

| 面 | 今天实际 |
|----|----------|
| 组件 | `ai-chat/usage/session-meter.tsx`，挂在 `composer-footer.tsx` 底栏左簇（附件 / 引擎芯片 / 思考档 / CU / 宿主注入 **之后**） |
| 可见 | `font-mono text-caption-2-medium tabular-nums text-text-tertiary`：`{formatTokens(usedTokens)} tok`。容器 `<36rem` 隐藏（`hidden … @[36rem]:inline-flex`） |
| 悬停 | 原生 `title`：`chat.usage.sessionMeterHint` = 「本轮 token · 上下文占用」，有窗口再拼 `(N%)`。**无花费、无分项、无「估算」** |
| 数字来源 | `useContextInspectorData` → `estimateContextWindowStats`（消息 + 常驻规则 + MCP + 技能 + 记忆的**上下文占用**），**不是** `usage.updated` 的 API 分项，也不是会话各 run 花费之和 |
| 空态 | `usedTokens <= 0 && !running` 整枚隐藏 |

### observability trace `estimatedCost`

| 面 | 今天实际 |
|----|----------|
| 写入 | `observability/services/trace-tree-builder.ts` **写死** `estimatedCost: 0`。`trace-tree-builder.test.ts` 断言恒为 0 |
| 类型 | `TraceSummaryData.estimatedCost: number`（必填数字，不能表示「未知」）。`SpanNode.cost?` 未接线 |
| **现网 UI** | `trace-summary-header.tsx` 六格是 Duration / TTFO / Tokens / Model / Spans / Trace ID，**根本不渲染** `estimatedCost`。模型路由图注释写明「不做费用估算」 |
| spec | `observability.md`：「`estimatedCost` 目前没有真实单价字段，固定 0。……要恢复费用必须先把真实单价做成 Provider 档案字段」 |
| 指标字段 | `TelemetryMetric` 只有 `inputTokens` / `outputTokens`，**无**缓存读/写、推理、花费。`usage.updated`（`ipc-contract`）同样只有 input / output / total / duration / tps / `contextWindow` |

### 供应商设置 · API key / 自定义端点 / 模型行

| 面 | 今天实际 |
|----|----------|
| 页 | `#/settings/providers` · `ProviderSettings`：已配置 / 探索预设；标题「模型供应商」 |
| 抽屉 | `ProviderEditorDrawer`，宽 `min(32rem)`；页签「连接 / 模型 / 参数 / 覆盖」 |
| 模型行 | `provider-model-row.tsx`：品牌标 + `model.id` + 启用/关闭 + 主力 + 删；下一行两格「上下文」「最大输出」。**无单价栏** |
| 档案类型 | `EditorModel` = `id / label / enabled / source / contextWindow / maxOutputTokens`。`packages/providers` profile **无**每百万 token 单价字段 |
| 自定义端点 | `presets/local.ts` `kind: "custom"`，`requiresKey: true`，`endpoints: {}`，协议在抽屉主 API 选。默认模型目录空 |
| API key 档案 | 连接页填密钥（列表只写「密钥已保存」）；模型来自预设 / 拉取 / 手填 |

### 本地供应商与外置 ACP

| 面 | 今天实际 |
|----|----------|
| Ollama | `kind: "ollama"`，`group: "local"`，`requiresKey: false`，默认 `http://127.0.0.1:11434/v1` |
| LM Studio | `kind: "lmstudio"`，同上，默认 `http://127.0.0.1:1234/v1` |
| Enjoy Local | `agent-tools/presets.ts` `id: "enjoy-local"`，`label: "Enjoy 本地"`，`transport: "local"`。算价只发生在这条内核走 vault 模型时 |
| 外置引擎 | Claude Code（`claude`）/ Codex CLI（`codex`）等 `transport: "acp-host"`。C 端品牌名，不要枚举 id |
| ACP 用量 | `map-acp-usage.ts`：`usage_update.used` → `inputTokens`/`totalTokens`，`size` → `contextWindow`。**不映射花费**。`usage.updated` 合约也没有 cost |
| 订阅额度 | Claude / Codex `quota=false`，已登录只显示账号、不画空条、**不折算美元**（`agent-cli` / `m1-usage`） |
| 另一条花费面 | `#/observability` 本机 CLI transcript 的 Grok `costUsdTicks` 是扫盘记录，**不是**本刀 run ledger / meter / trace。不要画成「本月账单」 |

---

## Do

1. **价格快照**：models.dev 离线快照随包放 `packages/providers`，带版本和日期；字段按每百万 token：输入/输出/缓存读/缓存写/推理，USD。
2. **用户单价优先**：provider 档案里每个模型可填单价，填了覆盖快照；自定义端点默认未知。
3. **匹配不猜**：provider + modelId 精确命中才用，别名只认快照写明的。
4. **计算**：按每步 usage 分项计价；某项有 token 但无单价 → 整次「—」，悬停写明缺哪项。
5. **显示**：run ledger 用量行、`session-meter` 悬停、observability trace `estimatedCost`。金额旁始终有「估算」；悬停写来源（「models.dev 快照 · 日期」或「你填的单价」）；< $0.01 显示「<$0.01」。
6. **主路径不联网**；快照随应用版本更新。

---

## Don’t

自称账单/实际花费 · 模糊匹配/按家族猜价 · 运行路径联网 · 给订阅制外置引擎折算美元 · 未知显示 $0.00 · 本刀做预算/超额提醒/上限/汇率

---

## 验收 C1–C7

- **C1** 快照命中的 API 模型 →「估算 $x.xx」，悬停显示 models.dev 快照与日期
- **C2** 用户填单价 → 用填的价，悬停「你填的单价」
- **C3** 未命中且没填 →「—」+「价格未知，可在供应商设置里填写」，无 $0.00
- **C4** 有缓存/推理 token 但缺单价 → 整次「—」，悬停写缺项
- **C5** Ollama / LM Studio →「本地 · 不计费」
- **C6** 外置引擎：上报了就原样显示+来源；没上报不显示；不折算订阅
- **C7** 断网照常估算；trace `estimatedCost` 不再恒为 0

---

## Luna 一句

「价签上写着估算」——金额永远带「估算」，不知道就老实画一条横线。

---

## Luna 钉 · session-meter 会话合计（请 jojo 复审）

现网 meter 是**上下文占用**（「12.4k tok」+ title「本轮 token · 上下文占用」），不是会话美元合计。本刀**不改**可见 token 铬条，只在悬停里加花费。

**钉：有任何一次 Enjoy Local 跑价未知，就不凑假总额。**

悬停主句：

- 本会话 Enjoy Local 全部可估 → `估算 $x.xx`
- 有未知（未命中 / 没填 / 缺项）→ `已知部分 估算 $x.xx · N 次价格未知`

不计进「价格未知」、也不加进美元的：

- Ollama / LM Studio（「本地 · 不计费」）
- 外置 ACP **没上报**花费（用量行根本不留花费位）

外置 ACP **上报了**：悬停另起 mute 一行 `另有引擎上报 $x.xx`，**不**和 Enjoy Local 估算加总。上报数字原样，前面不加「估算」。

请 jojo 复审：meter 悬停要不要出现「另有引擎上报」；若觉得吵，可只留在该次用量行。

---

## 显示钉（落地给 mike）

- 「估算」是金额旁的 mute 小字，**不是**彩色徽章、不是「本月账单」标题。
- 未知画「—」，禁止 `$0.00`。
- `< $0.01` 显示 `估算 <$0.01`，不要 `估算 $0.00`。
- Token 行保持「本轮 {n} tokens」现格式；花费跟在同一行右侧，或次行 mute，不要另起账单卡。
- 外置上报：`$1.20 · Claude Code 上报`（人话品牌，不要 `claude` / `acp-host`）。没上报：只有 token，花费位留空。
- 悬停脚注一律：`这是按单价算的估算，不是账单`。
- 预览与实现里的价、日期、token 数都是**示例数字**，脚注写明；禁止写成「models.dev 官价」。

---

## 切片与边界

- 本 PR 只锁视觉与文案。kai 快照/匹配/计算、mike 三处铬，另开实现 PR。
- I3（Registry ACP 花名册）仍停。不把 Registry / 国产 CLI 扩容画进本页。
- 不改订阅额度条、不把 Grok transcript `costUsdTicks` 升成账单。
- 落地字段、IPC、是否给 `usage.updated` 补缓存/推理分项，以届时 spec 为准；预览只要求 C 端能画出五项分项。
