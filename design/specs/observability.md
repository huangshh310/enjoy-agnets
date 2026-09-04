# spec/observability

> 本地指标、脱敏、可视化大盘与 OTEL 兼容。最后更新：2026-09-04

## 当前真相

默认 `telemetryPolicy=local`。记录 kind / status / token / 耗时 / TTFO / tokens/s / 错误分类。prompt、文件内容、工具完整参数、API Key、`runtimeContext` 经 `redactMetric` 脱敏。外部 OTEL 默认关，需用户显式 `observability.setPolicy` 并配置合法 `http(s)` endpoint 才会 POST OTLP JSON。CSV 导出含 `ttfoMs` / `tokensPerSecond`。诊断页展示 TTFO。

路由：`#/observability`，在 `AppShell` 内换轨。提供三大视图模式：
1. **监控与图表大盘 (Dashboard)**：4 大核心 KPI 指标卡、耗时与 TTFO 时序趋势渐变面积图、模型负载分布柱状图、状态健康 Donut 环形图与异常根因分析；
2. **链路明细日志 (Traces Log)**：多维状态/类型过滤、高密度执行列表与 Trace 诊断详情抽屉。对齐原型 Slide 11「Run Timeline not metric wall」，时间尺只用指标里有的 send → TTFO → done（没有逐步 tool/approval 数据就不要画）。指标没有 `sessionId` 时只提供「回到对话」，不要假装能打开源会话；
3. **事件流回放 (Stream Replay)**：主进程内存缓冲事件流回放。
可一键导出 JSON / CSV 报表。
## 不变量

- 日志与导出不得含明文 Key 或完整 prompt。
- renderer 只能读聚合指标，不能读密钥。

## 代码入口

- `packages/agent-core/src/observability/redact.ts`
- `packages/agent-core/src/runtime/event-buffer.ts`
- `apps/desktop/src/main/services/telemetry-service.ts`
- `apps/desktop/src/main/services/event-bus.ts`

## 已知坑

- `@ai-sdk/otel` 不是默认依赖；本仓用 `toOtlpJson` 自建载荷。`otelEndpointAllowed` 拒绝空值、非法 URL、localhost / 内网 / link-local / metadata host，未配置时 `maybeExportOtel` 直接返回。
- `listReplayEvents` 必须先 `summarizeReplayEvents`；缓冲里仍有完整 `StreamEvent`，不要把原文经 IPC 交给 renderer。
- Agent 首 token 以第一次 `text.delta` 计 TTFO；没有可见文本的工具轮次可以没有 `ttfoMs`。
- 断线重放用 `orderReplayEvents` 按 `sequence` 排序，不要按到达时间。
