/**
 * 进阶沙箱状态文案：用标志位拼人话，不把主进程 blockedReason 原文摊给 C 端。
 */
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

type HarnessPublic = SettingsSnapshot["harness"]

export function harnessStatusCopy(
  harness: HarnessPublic | undefined,
  t: TranslateFn
): { description: string; summary: string } {
  const adapter = harness?.adapterLabel ?? t("settings.harness.none")
  const key = harness?.hasProviderKey ? t("common.providersKey") : t("common.noProviderKey")
  const token = !harness?.needsSandbox
    ? ""
    : ` · ${harness.hasSandboxToken ? t("settings.harness.sandboxSaved") : t("settings.harness.sandboxMissing")}`
  return {
    description: describeHarness(harness, t),
    summary: `${adapter} · ${key}${token}`
  }
}

function describeHarness(harness: HarnessPublic | undefined, t: TranslateFn): string {
  if (!harness) return t("settings.harness.ready")
  if (harness.usesProviderKey && !harness.hasProviderKey) return t("settings.harness.needProviderKey")
  if (harness.needsSandbox && !harness.hasSandboxToken) return t("settings.harness.sandboxMissing")
  return t("settings.harness.ready")
}
