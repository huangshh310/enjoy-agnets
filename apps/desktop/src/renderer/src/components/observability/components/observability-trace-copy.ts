/**
 * Trace 诊断弹窗的 OTEL 属性行与异常提示文案。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

export function getTraceOtelRows(
  metric: TelemetryMetric,
  t: TranslateFn,
  info: {
    duration: number
    ttfo: number
    inTok: number
    outTok: number
    totalTokens: number
    timeFormatted: string
  }
) {
  const { duration, ttfo, inTok, outTok, totalTokens, timeFormatted } = info
  return [
    {
      key: "ai.telemetry.functionId",
      label: t("pages.observability.attrFunctionId"),
      value: metric.runId || metric.id
    },
    {
      key: "ai.operation.name",
      label: t("pages.observability.attrWorkload"),
      value: metric.kind
    },
    {
      key: "ai.model.id",
      label: t("pages.observability.attrModel"),
      value: metric.modelId ?? t("pages.observability.default")
    },
    {
      key: "ai.response.status",
      label: t("pages.observability.attrStatus"),
      value: metric.status
    },
    {
      key: "ai.response.duration",
      label: t("pages.observability.attrDuration"),
      value: `${duration}ms`
    },
    {
      key: "ai.response.msToFirstChunk",
      label: t("pages.observability.attrTtfo"),
      value: ttfo > 0 ? `${ttfo}ms` : t("pages.observability.na")
    },
    {
      key: "ai.usage.promptTokens",
      label: t("pages.observability.attrInputTokens"),
      value: String(inTok)
    },
    {
      key: "ai.usage.completionTokens",
      label: t("pages.observability.attrOutputTokens"),
      value: String(outTok)
    },
    {
      key: "ai.usage.totalTokens",
      label: t("pages.observability.attrTotalTokens"),
      value: String(totalTokens)
    },
    {
      key: "ai.telemetry.throughput",
      label: t("pages.observability.attrToksPerSec"),
      value: metric.tokensPerSecond
        ? t("pages.observability.tokPerS", { n: metric.tokensPerSecond.toFixed(1) })
        : t("pages.observability.na")
    },
    {
      key: "ai.error.class",
      label: t("pages.observability.attrErrorClass"),
      value: metric.errorClass || t("pages.observability.none")
    },
    {
      key: "telemetry.timestamp",
      label: t("pages.observability.attrTimestamp"),
      value: timeFormatted
    }
  ]
}

export function getTraceErrorHint(errorClass: string, t: TranslateFn) {
  if (errorClass === "timeout") return t("pages.observability.timeoutHint")
  if (errorClass === "provider") return t("pages.observability.providerHint")
  return t("pages.observability.runtimeHint")
}
