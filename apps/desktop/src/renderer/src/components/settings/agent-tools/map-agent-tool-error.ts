/**
 * agentTools IPC 失败：剥掉 Electron 包装，给界面人话。
 */
import type { TranslateFn } from "@renderer/i18n"

export function unwrapIpcError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^CatalogError:\s*/i, "")
    .trim()
}

export function mapBindError(message: string, t: TranslateFn): string {
  const lower = message.toLowerCase()
  if (lower.includes("protocol cannot bind")) return t("settings.agentTools.bindProtocolDenied")
  if (lower.includes("profile was not found")) return t("settings.agentTools.bindProfileMissing")
  return message
}
