/**
 * 记住最近一次医生报告里的输入监听。
 * 只有签名 helper 自己报已授权，才允许全局 Esc。
 */
let granted = false
let onChange: (() => void) | null = null

export function rememberInputMonitoring(report: Record<string, unknown>): void {
  const next = report.helperSigned === true && report.inputMonitoring === true
  if (next === granted) return
  granted = next
  onChange?.()
}

export function inputMonitoringStopsGlobally(): boolean {
  return granted
}

export function watchInputMonitoring(listener: () => void): void {
  onChange = listener
}
