/**
 * 仅在 telemetryPolicy=otel 且 endpoint 合法时 POST OTLP JSON。
 */
import { otelEndpointAllowed, toOtlpJson } from "@enjoy-agents/agent-core"
import { getSetting } from "./database"

export async function maybeExportOtel(input: Parameters<typeof toOtlpJson>[0]): Promise<void> {
  const endpoint = getSetting("otelEndpoint")
  if (!otelEndpointAllowed(endpoint)) return
  try {
    await fetch(endpoint!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toOtlpJson(input))
    })
  } catch {
    return
  }
}
