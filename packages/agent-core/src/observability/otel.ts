/**
 * 可选 OTLP JSON 载荷。未配置 endpoint 时调用方不得出网。
 */
import { redactMetric } from "./redact.ts"

export type OtelMetricInput = {
  runId: string
  kind: string
  modelId?: string
  status: string
  durationMs?: number
  ttfoMs?: number
  inputTokens?: number
  outputTokens?: number
  tokensPerSecond?: number
  errorClass?: string
}

/** 把脱敏后的本地指标编成 OTLP/HTTP JSON。 */
export function toOtlpJson(input: OtelMetricInput): Record<string, unknown> {
  const safe = redactMetric(input)
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: "service.name", value: { stringValue: "enjoy-agents" } }]
        },
        scopeSpans: [
          {
            scope: { name: "enjoy-agents.telemetry" },
            spans: [
              {
                name: String(safe.kind ?? input.kind),
                attributes: [
                  { key: "run.id", value: { stringValue: String(safe.runId ?? input.runId) } },
                  { key: "run.status", value: { stringValue: input.status } },
                  { key: "gen_ai.request.model", value: { stringValue: input.modelId ?? "" } },
                  { key: "gen_ai.usage.input_tokens", value: { intValue: input.inputTokens ?? 0 } },
                  { key: "gen_ai.usage.output_tokens", value: { intValue: input.outputTokens ?? 0 } },
                  { key: "enjoy.ttfo_ms", value: { intValue: input.ttfoMs ?? 0 } },
                  { key: "enjoy.tokens_per_second", value: { doubleValue: input.tokensPerSecond ?? 0 } },
                  { key: "error.class", value: { stringValue: input.errorClass ?? "" } }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

export function otelEndpointAllowed(endpoint?: string): boolean {
  if (!endpoint?.trim()) return false
  try {
    const url = new URL(endpoint)
    if (url.protocol !== "https:" && url.protocol !== "http:") return false
    return !isBlockedOtelHost(url.hostname)
  } catch {
    return false
  }
}

function isBlockedOtelHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost" || host.endsWith(".localhost")) return true
  if (host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return true
  if (host === "metadata.google.internal" || host === "metadata.google.com") return true
  return isPrivateIpv4(host)
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((item) => Number(item))
  if (parts.length !== 4 || parts.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    return false
  }
  const [first, second] = parts
  if (first === 10 || first === 127) return true
  if (first === 169 && second === 254) return true
  if (first === 172 && second !== undefined && second >= 16 && second <= 31) return true
  return first === 192 && second === 168
}
