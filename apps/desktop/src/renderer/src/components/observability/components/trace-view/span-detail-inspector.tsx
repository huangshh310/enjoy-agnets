/**
 * 选定 Span 联动详情检查器 (Span Detail Inspector)：
 * 呈现选中 Span 的核心指标、时序内切分解、脱敏隐私说明、Input/Output 与 OTEL 属性。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { getSpanKindConfig } from "../../services/span-kind-config"
import type { SpanNode } from "../../types/trace-span.types"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import { formatLatency } from "../model-routing/model-routing-row-cells"

type InspectorTab = "io" | "attributes" | "metadata"

export function SpanDetailInspector(props: { span: SpanNode }) {
  const { span } = props
  const t = useT()
  const [activeTab, setActiveTab] = useState<InspectorTab>("io")
  const [ioViewMode, setIoViewMode] = useState<"pretty" | "json">("pretty")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const kinds = getSpanKindConfig(t)
  const cfg = kinds[span.kind] ?? kinds.agent

  function handleCopy(key: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const inTok = span.inputTokens ?? 0
  const outTok = span.outputTokens ?? 0
  const totalTok = inTok + outTok
  const ttfo = span.ttfoMs ?? 0
  const duration = span.durationMs ?? 0
  const streamMs = ttfo > 0 && duration > ttfo ? duration - ttfo : 0

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs font-mono text-caption-2-regular h-full min-h-[360px]">
      {/* 1. Span 头部基本信息 */}
      <div className="flex flex-col gap-2.5 bg-background-secondary-default/30 p-4 border-b border-separator-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ backgroundColor: cfg.color }}
              className="size-2.5 rounded-full shrink-0"
            />
            <h3 className="font-bold text-caption-1-medium text-text-primary truncate">
              {span.name}
            </h3>
            <span
              className={cx(
                "rounded px-1.5 py-0.2 text-caption-2-bold font-bold uppercase",
                cfg.badgeClass
              )}
            >
              {span.kind}
            </span>
          </div>

          <span
            className={cx(
              "rounded px-2 py-0.5 text-caption-2-bold font-bold uppercase",
              span.status === "success"
                ? "text-state-success-text dark:text-state-success-text bg-state-success-text/10 border border-state-success-text/20"
                : "text-text-error-primary dark:text-text-error-primary bg-background-tertiary-error/10 border border-border-error-default/20"
            )}
          >
            {span.status}
          </span>
        </div>

        {/* 关键性能指标 4 列网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="flex flex-col rounded-lg bg-background-secondary-default/60 p-2 border border-separator-border/30">
            <span className="text-caption-2-bold text-text-tertiary">Duration</span>
            <span className="font-bold text-text-primary mt-0.5">{formatLatency(duration)}</span>
          </div>

          <div className="flex flex-col rounded-lg bg-background-secondary-default/60 p-2 border border-separator-border/30">
            <span className="text-caption-2-regular text-text-tertiary">First Token (TTFO)</span>
            <span className="font-bold text-status-yellow-text dark:text-status-yellow-text mt-0.5">
              {ttfo > 0 ? `${ttfo}ms` : "N/A"}
            </span>
          </div>

          <div className="flex flex-col rounded-lg bg-background-secondary-default/60 p-2 border border-separator-border/30">
            <span className="text-caption-2-bold text-text-tertiary">Tokens</span>
            <span className="font-bold text-text-primary mt-0.5">
              {totalTok > 0 ? `${formatTokens(totalTok)} tok` : "—"}
            </span>
          </div>

          <div className="flex flex-col rounded-lg bg-background-secondary-default/60 p-2 border border-separator-border/30 min-w-0">
            <span className="text-caption-2-regular text-text-tertiary">Model</span>
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              {span.model ? (
                <>
                  <ModelBrandIcon modelId={span.model} size={12} className="shrink-0" />
                  <span className="font-bold text-text-primary truncate">{span.model}</span>
                </>
              ) : (
                <span className="font-bold text-text-tertiary">default</span>
              )}
            </div>
          </div>
        </div>

        {/* 阶段耗时分解小条 (若有 TTFO) */}
        {ttfo > 0 && streamMs > 0 ? (
          <div className="flex items-center gap-2 pt-1 text-caption-2-regular text-text-secondary">
            <span className="text-text-tertiary">内切占比:</span>
            <div className="flex items-center gap-1 text-status-yellow-text dark:text-status-yellow-text font-medium">
              <span className="size-1.5 rounded-full bg-status-yellow-background" />
              <span>TTFO {ttfo}ms</span>
            </div>
            <span>+</span>
            <div className="flex items-center gap-1 text-accent-500 font-medium">
              <span className="size-1.5 rounded-full bg-accent-500" />
              <span>流式生成 {streamMs}ms</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. 标签栏切换 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-separator-border/60 bg-background-secondary-default/50">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("io")}
            className={cx(
              "rounded px-2.5 py-1 text-caption-2-medium font-medium transition-all",
              activeTab === "io"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            载荷与脱敏 (Payload)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attributes")}
            className={cx(
              "rounded px-2.5 py-1 text-caption-2-medium font-medium transition-all",
              activeTab === "attributes"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            OTel 属性 ({Object.keys(span.attributes ?? {}).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("metadata")}
            className={cx(
              "rounded px-2.5 py-1 text-caption-2-medium font-medium transition-all",
              activeTab === "metadata"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            元数据 (Metadata)
          </button>
        </div>

        {activeTab === "io" ? (
          <div className="flex items-center rounded border border-separator-border/60 bg-background-secondary-default p-0.5 text-caption-2-regular">
            <button
              type="button"
              onClick={() => setIoViewMode("pretty")}
              className={cx(
                "rounded px-1.5 py-0.2 font-semibold transition-all",
                ioViewMode === "pretty"
                  ? "bg-background-primary-default text-text-primary shadow-2xs"
                  : "text-text-secondary"
              )}
            >
              视图
            </button>
            <button
              type="button"
              onClick={() => setIoViewMode("json")}
              className={cx(
                "rounded px-1.5 py-0.2 font-semibold transition-all",
                ioViewMode === "json"
                  ? "bg-background-primary-default text-text-primary shadow-2xs"
                  : "text-text-secondary"
              )}
            >
              JSON
            </button>
          </div>
        ) : null}
      </div>

      {/* 3. 标签主体内容 */}
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3.5">
        {/* TAB 1: Input / Output */}
        {activeTab === "io" && (
          <div className="flex flex-col gap-3">
            {/* 本地隐私脱敏提示条 */}
            <div className="flex items-center gap-2 rounded-lg bg-state-success-text/[0.06] border border-state-success-text/20 p-2.5 text-caption-2-regular text-text-secondary">
              <RiShieldCheckLine className="size-4 text-state-success-text shrink-0" />
              <span>
                本地隐私切片保护：Prompt 正文与 API 密钥已脱敏，仅记录性能耗时与 Token 规模。
              </span>
            </div>

            {/* Input 块 */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3">
              <div className="flex items-center justify-between text-caption-2-semibold font-semibold text-text-tertiary">
                <span className="uppercase tracking-wider">
                  INPUT ({span.input?.role ?? "user"})
                  {inTok > 0 ? ` · ${formatTokens(inTok)} tokens` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("input", span.input?.content ?? "")}
                  className="hover:text-text-primary inline-flex items-center gap-1 text-caption-2-regular"
                >
                  {copiedKey === "input" ? (
                    <>
                      <RiCheckLine className="size-3 text-state-success-text" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <RiClipboardLine className="size-3" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
              <div className="rounded border border-separator-border/50 bg-background-primary-default p-2.5 text-caption-2-regular leading-relaxed text-text-primary whitespace-pre-wrap">
                {ioViewMode === "json" ? (
                  JSON.stringify(span.input ?? {}, null, 2)
                ) : span.input?.content && span.input.content !== "No input payload" ? (
                  span.input.content
                ) : (
                  <div className="flex flex-col gap-1 text-text-tertiary py-1">
                    <span className="font-semibold text-text-secondary">用户任务输入已脱敏保密</span>
                    <span className="text-caption-2-regular">
                      本次请求包含 {formatTokens(inTok)} 输入 Tokens，上游模型接收完整参数。
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Output 块 */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3">
              <div className="flex items-center justify-between text-caption-2-semibold font-semibold text-text-tertiary">
                <span className="uppercase tracking-wider">
                  OUTPUT ({span.output?.role ?? "assistant"})
                  {outTok > 0 ? ` · ${formatTokens(outTok)} tokens` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("output", span.output?.content ?? "")}
                  className="hover:text-text-primary inline-flex items-center gap-1 text-caption-2-regular"
                >
                  {copiedKey === "output" ? (
                    <>
                      <RiCheckLine className="size-3 text-state-success-text" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <RiClipboardLine className="size-3" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
              <div className="rounded border border-separator-border/50 bg-background-primary-default p-2.5 text-caption-2-regular leading-relaxed text-text-primary whitespace-pre-wrap">
                {ioViewMode === "json" ? (
                  JSON.stringify(span.output ?? {}, null, 2)
                ) : span.output?.content && span.output.content !== "No output payload" ? (
                  span.output.content
                ) : (
                  <div className="flex flex-col gap-1 text-text-tertiary py-1">
                    <span className="font-semibold text-text-secondary">助手生成回复已脱敏保密</span>
                    <span className="text-caption-2-regular">
                      本次执行流式产出 {formatTokens(outTok)} 输出 Tokens，状态为 {span.status}。
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Attributes */}
        {activeTab === "attributes" && (
          <div className="flex flex-col rounded-lg border border-separator-border/60 overflow-hidden">
            {Object.entries(span.attributes ?? {}).length === 0 ? (
              <div className="p-4 text-center text-text-tertiary">{t("pages.observability.noAttrs")}</div>
            ) : (
              <div className="divide-y divide-separator-border/40">
                {Object.entries(span.attributes ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 hover:bg-background-secondary-hover/30 transition-colors">
                    <span className="font-bold text-accent-600 dark:text-accent-400 truncate max-w-[200px]">
                      {k}
                    </span>
                    <span className="font-medium text-text-primary truncate max-w-[220px]">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Metadata */}
        {activeTab === "metadata" && (
          <div className="rounded-lg border border-separator-border/70 bg-background-secondary-default/50 p-3">
            <pre className="text-caption-2-regular text-text-primary leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(span.metadata ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
