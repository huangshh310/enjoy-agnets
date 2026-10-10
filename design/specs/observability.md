# spec/observability

> 本地指标、脱敏、可视化大盘与 OTEL 兼容。最后更新：2026-10-10（默认面：本机记录开关；无 clear 不画清除钮；OTEL 句只在开发者档）

## 当前真相

默认 `telemetryPolicy=local`。记录 kind / status / token / 耗时 / TTFO / tokens/s / 错误分类。prompt、文件内容、工具完整参数、API Key、`runtimeContext` 经 `redactMetric` 脱敏。外部 OTEL 默认关，需用户显式 `observability.setPolicy` 并配置合法 `http(s)` endpoint 才会 POST OTLP JSON。CSV 导出含 `ttfoMs` / `tokensPerSecond`。诊断页展示 TTFO。

`#/settings/telemetry` 默认面（jojo）：两块——收集说明 + 本机记录开关。默认政策 `local` 只写 SQLite、**不上传** Enjoy 云，文案钉死「只存在本机，不上传」。开关「记录本机运行数据（只存在本机，不上传）」接线 `telemetryPolicy`：开=`local`（若开发者档已是 `otel` 则保持）、关=`off`。**没有**匿名上传到 Enjoy 的独立设置，禁止写「帮助改进 / 匿名使用统计」。OTEL 导出句与端点配置**只在** `enjoy-agents-dev-copy=1`。没有 `observability.clear` IPC，默认面**不画**「清除本地记录」（TODO kai）。默认面若出数字，只走「平均首字时间 {n} 秒」。Local APM / TTFO / P95 / tok/s 整面板只在开发者档。页面本身不藏，开关始终可见。

路由：`#/observability` 进 `#/settings/telemetry`。开发者档仍可换轨看板：Stage 用 `fill` + `hideChrome`。左侧情境栏提供本地执行监控、模型路由、链路明细与事件回放 4 大导航入口，主舞台提供四大核心视图模式：
1. **监控与图表大盘 (Dashboard)**：支持时间范围窗口切片（1h / 6h / 24h / 7d / 全部）与本地实时探针状态指示；顶栏提供快捷状态分段胶囊（全部/成功/异常/慢调用）与模型联动筛选；4 大核心 KPI 指标卡嵌入原生 SVG Sparkline 迷你时序走势微图并集成 P50/P95 延迟、峰值速率与 Token 输入输出细分；配备 **AI APM 智能性能洞察与优化诊断卡片 (ObservabilityInsightsCard)**，基于采样自动诊断长尾瓶颈、异常归因与流式效率；全面采用 Recharts `ResponsiveContainer` 矢量自适应渲染带 P95 阈值标线的耗时与 TTFO 双轨平滑贝塞尔面积图、带平均基准线的 Prompt/Completion 堆叠柱与 TPS 吞吐复合图；多维分布矩阵重构为平衡 Bento 网格，包含模型负载与 Token 消耗全景（支持交互过滤）、系统健康度 Donut 环形图、异常根因分析排行、工作负载场景与延迟 SLA 阶梯分布；底部配备**慢调用与异常瓶颈聚焦看板 (ObservabilitySlowTraces)**，支持双视角（慢调用异常聚焦 / 最近执行流）与一键直达火焰图时间线（`Flame Chart`）与 Span 甘特树全景诊断；
2. **模型路由与上游调度 (Model Routing)**：对齐 Grok2API 路由架构，可视化对外模型标识、上游**协议风格 + 模型 id**（不下发 vault `baseURL`）、接口多模态能力、按 Telemetry 聚合的调用量 / 成功率 / P95（忽略 0ms）、以及一键 `settings.pingProvider` Ping；
3. **链路明细日志 (Traces Log)**：多维状态/类型过滤与高密度执行列表。点击任意一行展开全景链路诊断工作台（`FullTraceWorkbench`），支持四重视角切换：**Span 甘特树 (Waterfall)**（时间刻度标尺、层级折叠、TTFO 首字微观内切与流式生成分段）、**火焰图时间线 (Flame Chart)**（X 轴绝对时间、Y 轴调用栈深度、帧级时序排布与瓶颈分析）、**OTel 语义属性表**与**原始脱敏 JSON**，点击任意 Span 实时联动右侧检查器。详情标头配备官方品牌图标与**生命周期阶段耗时分解条 (TTFO 等待 vs 流式生成传输占比)**；右侧检查器集成 Token 规模细分与脱敏保护说明；下方配备**执行生命周期时序里程碑 (TraceMilestonesStream)** 与**同模型基准表现对比**（支持点击相邻执行快速切换诊断）。模型列与详情标头配备官方彩色/矢量品牌图标（`ModelBrandIcon`，自动匹配 OpenAI、Claude、Gemini、DeepSeek、Grok、Qwen 等厂商与 Antigravity / Cursor / 自定义上游回退）。时间尺用指标里有的 send → TTFO → done，再叠加本 run 回放缓冲里的 `tool.*` / `approval.required` / `approval.resolved`（工具名与 `decision`，不含 args）。`buildTraceDataFromMetric` **禁止**编造 RAG/MCP span 或 `|| 850` token。没有 `ttfoMs` 就不画 TTFO 段；没有 `durationMs` 就总时长为 0。`estimatedCost` 由 Enjoy Local 的 usage 分项 × 本地单价快照（或用户填的单价）算出，经 `telemetry_metrics.estimated_cost_usd` 接到 `buildTraceDataFromMetric`；缺量或缺单价是未知（`costStatus=unknown`，`estimatedCostUsd` / `estimatedCost` 省略），**不要写 0**。Ollama / LM Studio 是 `local_unbilled`。ACP 没上报花费是 `not_reported`，上报了是 `reported`（原样，不加「估算」）；上报金额只进 `costStatus`，**不要**写进 `estimatedCostUsd`。`buildTraceDataFromMetric` 同时带上 `costStatus` 与 `costMissing`（数据面，铬条由 mike 接）。`pnpm --filter @enjoy-agents/desktop dev:cost` 会给已结束的夹具 run 写入对应 `costStatus` / `estimatedCostUsd` / `costMissing`，只在开发态隔离 userData 下写，不进生产路径。模型路由图表仍不画费用。指标可带 `cacheReadTokens` / `cacheWriteTokens` / `reasoningTokens` / `estimatedCostUsd` / `costStatus` / `costMissing`。renderer 铬（trace 六格、meter 悬停）由 mike 接线，本刀只保证指标与合约不再恒为 0。指标没有 `sessionId` 时只提供「回到对话」，不要假装能打开源会话；
4. **事件流回放 (Stream Replay)**：主进程内存缓冲事件流全景回放工作台（`ObservabilityReplay`）。顶栏呈现主进程内存环形缓冲（容量 400 槽位、脱敏保护）状态指示与实时广播监听；配备 4 大 Bento KPI 仪表（缓冲池水位占比、活跃会话 Run 批次、事件类型细分、Sequence 严格保序重排状态）；提供交互式播放器（播放/暂停、单步跳进、重置回放、1x/2x/5x 调速）与进度高亮；支持按事件分类（生命周期/工具/审批）、活跃会话 Run 批次与关键字实时过滤；工作台采用双栏布局（左侧时序列表呈现 Sequence 序号、语义图标、相对时差；右侧深度检查器呈现事件元数据与脱敏 JSON 载荷一键复制）；内置标准 Agent 演练回放示例（覆盖 Agent 思考、工具调用、敏感审批与文本流式生成完整闭环），冷启或无活跃会话时支持一键演示；底部配备主进程 EventBuffer 环形缓冲与断线补偿机制原理图卡。
5. **本机记录 (cliUsage)**：导轨 12 个 CLI **都扫盘**（不再标「本版本不扫描」）。Claude / Codex jsonl、Grok `usage.json`、OMP `~/.omp/agent/sessions/**/*.jsonl`（camelCase `message.usage`）有字段就入表。Cursor 只扫 `projects/*/agent-transcripts/*.jsonl`（无 usage 字段 → scanned-empty）。其余按家目录 jsonl 扫，目录不在是 directory-missing，有文件无用量是 scanned-empty。不是官方额度，不上 Composer。顶部脉冲行展示总计与会话；下方配备核心双图展台（`CliUsageChartDock`：左侧环形甜甜圈图支持按 CLI 来源 / 模型分布双视角切换与品牌标联动，右侧时序趋势平滑渐变面积图支持按输入/输出/缓存 Token 构成堆叠与总量趋势）+ EvilCharts 多维图廊（`CliUsageGallery`：支持日格年度方块热力、模型消耗横向排行、日消耗+累计组合图与累计增长曲线切换）；下方保留「按 CLI 贡献」点选过滤芯片与无用量源收起；底部日 / 模型 / 项目一张表（模型 Tab 支持官方彩色品牌标展示）。不估单价、不读 `store.db` / prompt。顶栏本视图用「本机记录」文案。
可一键导出 JSON / CSV 报表（仍只含 Enjoy 遥测，不含 jsonl 原文）。
## 不变量

- 日志与导出不得含明文 Key 或完整 prompt。
- renderer 只能读聚合指标，不能读密钥。

## 代码入口

- `packages/agent-core/src/observability/redact.ts`
- `packages/agent-core/src/runtime/event-buffer.ts`
- `apps/desktop/src/main/services/telemetry-service.ts`
- 复检夹具（只写隔离库）：`apps/desktop/src/main/services/cost-seed-write.ts`
- `apps/desktop/src/main/services/event-bus.ts`
- `apps/desktop/src/renderer/src/components/observability/observability-page.tsx`
- `apps/desktop/src/renderer/src/components/observability/use-observability-page.ts`
- 本机记录：`apps/desktop/src/main/services/cli-transcript-usage/`、`observability/components/cli-usage/`

## 已知坑

- 没有 `observability.clear` IPC。默认面不得画「清除本地记录」确认钮假装能删。等 kai 补频道后再放。
- 资料页花费只认本年有限的 `estimatedCostUsd` 求和。条数不当美元；没有费用来源整行不画，禁止 `$0` 占位。
- `@ai-sdk/otel` 不是默认依赖；本仓用 `toOtlpJson` 自建载荷。`otelEndpointAllowed` 拒绝空值、非法 URL、localhost / 内网 / link-local / metadata host，未配置时 `maybeExportOtel` 直接返回。
- `listReplayEvents` 必须先 `summarizeReplayEvents`；缓冲里仍有完整 `StreamEvent`，不要把原文经 IPC 交给 renderer。
- Agent 首 token 以第一次 `text.delta` 计 TTFO；没有可见文本的工具轮次可以没有 `ttfoMs`。
- 断线重放用 `orderReplayEvents` 按 `sequence` 排序，不要按到达时间。
- 模型路由视图严禁仅静态罗列：必须与 TelemetryMetrics 动态聚合关联，展示真实的 P95 延迟、成功率与调用计数，并提供直通对应模型链路日志（按 `modelId` **精确**过滤，不是子串搜索）与 Provider 配置页跳转。
- 遥测与模型路由数据表格必须支持视口高度智能自适应（`getAdaptivePageSize`）：高度 **> 1150px** 默认 20 条，resize 会重算（用户手改页大小后不再覆盖）。Traces 列表在 `fill` 里自带滚动，分页栏 `shrink-0` 贴该视图底边，不要再靠整页 `justify-between`。
- Ping 必须打 `settings.pingProvider`（已存供应商 id + kind），禁止用 `observability.metrics` 耗时或 `Math.max(ms, 45)` 假装连通。没有 `providerId` 就禁用探测，不要报假成功。
- 侧栏模型数量用 `store.models.length`，0 就是 0，禁止 `|| 10`。上游列没有协议信息时只显示模型 id，禁止拼 `Endpoint/{id}`。
- 健康态看该行是否已配置模型 + 调用成功率，不要用全局 `hasKey` 一刀切。
- `observability.cliUsage` 不得把 prompt、jsonl 原文或绝对路径交给 renderer。目录不存在是空态，不是 0 填充条。导轨 CLI 都扫盘；没有用量字段是 scanned-empty，不要写「本版本不扫描」。Cursor 禁止读 `store.db` / 禁止扫 `node_modules`。Grok 只接受 `sessions/<group>/<id>/usage.json`。OMP 只累加 `message.usage` 数字，不把 `cost` 美元当账单。Codex 拆分全 0 画 `—`。混合有/无拆分时脉冲行不画输入/输出/缓存。过滤走 client-side：KPI 用源级字段，表行按 `sourceIds` 筛选。贡献列费用 / token / 占比定宽对齐；脉冲行合计与会话同一栅格。
- 本机记录滚动与 Recharts 规范：`observability-page.tsx` 中 `cliUsage` 视图必须由外层 `<div className="min-h-0 flex-1 overflow-y-auto">` 统一承担滚动，内部组件不得嵌套第二层 `overflow-y-auto` 以免外层剪裁导致无法滚动；CSS Grid 内的 Recharts 组件（如 `CliUsageAreaChart`、`CliUsageGallery`）必须设置显式像素高度（如 `height={210}` / `height={240}`），禁止在 Grid 单元中使用 `height="100%"` 导致高度测量坍塌；环形图图例禁止添加 `overflow-hidden` 以免多源被截断。

