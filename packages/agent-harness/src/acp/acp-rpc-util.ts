/**
 * ACP JSON-RPC 小工具。
 */
import type { AcpPermissionOption } from "./permissions.ts"

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function asPermissionOption(value: unknown): AcpPermissionOption {
  const rec = asRecord(value)
  return {
    optionId: String(rec.optionId ?? rec.id ?? ""),
    name: typeof rec.name === "string" ? rec.name : undefined,
    kind: typeof rec.kind === "string" ? rec.kind : undefined
  }
}

export function acpExitMessage(code: number | null, stderr: string): string {
  const detail = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ")
  return detail
    ? `ACP process exited with ${code ?? "null"}: ${detail}`
    : `ACP process exited with ${code ?? "null"}`
}
