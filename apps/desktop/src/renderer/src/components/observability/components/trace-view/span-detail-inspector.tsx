/**
 * 选定 Span 联动详情检查器 (Span Detail Inspector)：
 * 呈现选中 Span 的核心指标、Metadata、Input/Output (Pretty Markdown/JSON 切换) 与 OTEL 属性。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { SPAN_KIND_CONFIG } from "../../services/trace-tree-builder"
import type { SpanNode } from "../../types/trace-span.types"

type InspectorTab = "io" | "attributes" | "metadata"

export function SpanDetailInspector(props: { span: SpanNode }) {
  const { span } = props
  const [activeTab, setActiveTab] = useState<InspectorTab>("io")
  const [ioViewMode, setIoViewMode] = useState<"pretty" | "json">("pretty")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const cfg = SPAN_KIND_CONFIG[span.kind] ?? SPAN_KIND_CONFIG.agent

  function handleCopy(key: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs font-mono text-[11px] h-full">
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
                "rounded px-1.5 py-0.2 text-[9.5px] font-bold uppercase",
                cfg.badgeClass
              )}
            >
              {span.kind}
            </span>
          </div>

          <span
            className={cx(
              "rounded px-1.5 py-0.2 text-[9.5px] font-bold uppercase",
              span.status === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
            )}
          >
            {span.status}
          </span>
        </div>

        {/* 关键性能指标 4 列网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="flex flex-col rounded bg-background-secondary-default/60 p-2">
            <span className="text-[10px] text-text-tertiary">Duration</span>
            <span className="font-bold text-text-primary mt-0.5">{span.durationMs}ms</span>
          </div>

          <div className="flex flex-col rounded bg-background-secondary-default/60 p-2">
            <span className="text-[10px] text-text-tertiary">First Token</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {span.ttfoMs ? `${span.ttfoMs}ms` : "N/A"}
            </span>
          </div>

          <div className="flex flex-col rounded bg-background-secondary-default/60 p-2">
            <span className="text-[10px] text-text-tertiary">Tokens</span>
            <span className="font-bold text-text-primary mt-0.5">
              {(span.inputTokens ?? 0) + (span.outputTokens ?? 0)} tok
            </span>
          </div>

          <div className="flex flex-col rounded bg-background-secondary-default/60 p-2">
            <span className="text-[10px] text-text-tertiary">Model</span>
            <span className="font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
              {span.model ?? "default"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 标签栏切换 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-separator-border/60 bg-background-secondary-default/50">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("io")}
            className={cx(
              "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
              activeTab === "io"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            Input / Output
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attributes")}
            className={cx(
              "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
              activeTab === "attributes"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            Attributes ({Object.keys(span.attributes ?? {}).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("metadata")}
            className={cx(
              "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
              activeTab === "metadata"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            Metadata
          </button>
        </div>

        {activeTab === "io" ? (
          <div className="flex items-center rounded border border-separator-border/60 bg-background-secondary-default p-0.5 text-[10px]">
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
              Pretty
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
      <div className="p-4 flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-3.5">
        {/* TAB 1: Input / Output */}
        {activeTab === "io" && (
          <div className="flex flex-col gap-3">
            {/* Input 块 */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3">
              <div className="flex items-center justify-between text-[10.5px] font-semibold text-text-tertiary">
                <span className="uppercase tracking-wider">
                  INPUT ({span.input?.role ?? "user"})
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("input", span.input?.content ?? "")}
                  className="hover:text-text-primary"
                >
                  {copiedKey === "input" ? "已复制" : "复制"}
                </button>
              </div>
              <div className="rounded border border-separator-border/50 bg-background-primary-default p-2.5 text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap">
                {ioViewMode === "json"
                  ? JSON.stringify(span.input ?? {}, null, 2)
                  : span.input?.content || "No input payload"}
              </div>
            </div>

            {/* Output 块 */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3">
              <div className="flex items-center justify-between text-[10.5px] font-semibold text-text-tertiary">
                <span className="uppercase tracking-wider">
                  OUTPUT ({span.output?.role ?? "assistant"})
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("output", span.output?.content ?? "")}
                  className="hover:text-text-primary"
                >
                  {copiedKey === "output" ? "已复制" : "复制"}
                </button>
              </div>
              <div className="rounded border border-separator-border/50 bg-background-primary-default p-2.5 text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap">
                {ioViewMode === "json"
                  ? JSON.stringify(span.output ?? {}, null, 2)
                  : span.output?.content || "No output payload"}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Attributes */}
        {activeTab === "attributes" && (
          <div className="flex flex-col rounded-lg border border-separator-border/60 overflow-hidden">
            {Object.entries(span.attributes ?? {}).length === 0 ? (
              <div className="p-4 text-center text-text-tertiary">无语义属性数据</div>
            ) : (
              <div className="divide-y divide-separator-border/40">
                {Object.entries(span.attributes ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2">
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
            <pre className="text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(span.metadata ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
