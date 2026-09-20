/**
 * 把 upsert 补丁叠到已有行上，避免开关时丢掉 cron / 上次运行。
 */
import type { Automation, UpsertAutomationInput } from "@enjoy-agents/ipc-contract"

export function mergeAutomation(
  existing: Automation | undefined,
  input: UpsertAutomationInput,
  id: string,
  now = Date.now()
): Automation {
  return {
    id,
    name: input.name,
    prompt: input.prompt,
    trigger: input.trigger,
    triggers: input.triggers !== undefined ? input.triggers : existing?.triggers,
    cronExpr: pickOptional(input.cronExpr, existing?.cronExpr),
    timeZone: pickOptional(input.timeZone, existing?.timeZone),
    webhookPort: input.webhookPort ?? existing?.webhookPort,
    webhookPath: pickOptional(input.webhookPath, existing?.webhookPath),
    webhookSecret: pickOptional(input.webhookSecret, existing?.webhookSecret),
    runtimeId: pickOptional(input.runtimeId, existing?.runtimeId),
    modelId: pickOptional(input.modelId, existing?.modelId),
    mode: input.mode ?? existing?.mode ?? "agent",
    stopOnFailCount: input.stopOnFailCount ?? existing?.stopOnFailCount,
    consecutiveFails: input.consecutiveFails ?? existing?.consecutiveFails ?? 0,
    lastRunAt: input.lastRunAt ?? existing?.lastRunAt,
    lastRunStatus: input.lastRunStatus ?? existing?.lastRunStatus,
    lastSessionId: input.lastSessionId ?? existing?.lastSessionId,
    lastError: input.lastError ?? existing?.lastError,
    enabled: input.enabled,
    updatedAt: now
  }
}

function pickOptional(next: string | undefined, prev: string | undefined): string | undefined {
  if (next === undefined) return prev
  const trimmed = next.trim()
  return trimmed || undefined
}
