/**
 * 本机 cron 滴答 + webhook 监听。没有窗口就不跑；退出即停，不补错过的点。
 */
import { shouldFireCron } from "./automations-cron"
import { cancelOnSaveFire, launchAutomationAgent } from "./automations-run"
import { firstLiveWindow } from "./automations-notify"
import { isAutomationRunning, readAutomations } from "./automations-store"
import { stopWebhookListeners, syncWebhookListeners } from "./automations-webhook"
import { tickSessionHeartbeats } from "./session-heartbeat-tick"

const DEFAULT_INTERVAL_MS = 20_000
let timer: ReturnType<typeof setInterval> | undefined

export function startAutomationScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  stopAutomationScheduler()
  timer = setInterval(() => {
    void tickAutomations(new Date())
  }, intervalMs)
  void tickAutomations(new Date())
  void syncWebhookListeners()
}

export function stopAutomationScheduler(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  cancelOnSaveFire()
  void stopWebhookListeners()
}

export async function tickAutomations(now: Date): Promise<string[]> {
  const window = firstLiveWindow()
  if (!window) return []
  void tickSessionHeartbeats(window, now).catch(() => undefined)
  const fired: string[] = []
  for (const item of readAutomations()) {
    if (
      !shouldFireCron({
        enabled: item.enabled,
        trigger: item.trigger,
        triggers: item.triggers,
        cronExpr: item.cronExpr,
        timeZone: item.timeZone,
        lastRunAt: item.lastRunAt,
        running: isAutomationRunning(item.id),
        now
      })
    ) {
      continue
    }
    fired.push(item.id)
    void launchAutomationAgent(window, item).catch(() => {
      // 失败已 stamp run.error + lastRunStatus；滴答继续看下一条。
    })
  }
  return fired
}
