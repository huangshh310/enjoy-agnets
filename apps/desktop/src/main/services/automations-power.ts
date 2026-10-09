/**
 * 睡眠 / 唤醒与 lastAlive。Win / macOS / Linux 都走 Electron powerMonitor。
 */
import { MISSED_LOOKBACK_MS } from "@enjoy-agents/ipc-contract/automations-missed"
import {
  defaultSettingsIo,
  readAliveState,
  writeAliveState,
  type SettingsIo
} from "./automations-missed-store.ts"

export type PowerMonitorHooks = {
  onSuspend: (fn: () => void) => void
  onResume: (fn: () => void) => void
  off?: () => void
}

let sessionStartedAt = 0
let unbind: (() => void) | undefined

export function automationSessionStartedAt(): number {
  return sessionStartedAt
}

export function markAutomationSessionStarted(now = Date.now(), io: SettingsIo = defaultSettingsIo()): number {
  sessionStartedAt = now
  const current = readAliveState(io)
  const previous = current.lastAliveAt > 0 ? current.lastAliveAt : undefined
  writeAliveState(io, {
    ...current,
    sessionStartedAt: now,
    lastAliveAt: previous ?? now,
    scanFromAt: current.scanFromAt && current.scanFromAt > 0 ? current.scanFromAt : previous
  })
  return now
}

export function stampAutomationAlive(now = Date.now(), io: SettingsIo = defaultSettingsIo()): void {
  const current = readAliveState(io)
  writeAliveState(io, { ...current, lastAliveAt: now })
}

export function recordAutomationSuspend(now = Date.now(), io: SettingsIo = defaultSettingsIo()): void {
  const current = readAliveState(io)
  writeAliveState(io, { ...current, lastSuspendAt: now, lastAliveAt: now })
}

export function recordAutomationResume(now = Date.now(), io: SettingsIo = defaultSettingsIo()): void {
  const current = readAliveState(io)
  const start = current.lastSuspendAt
  const sleepWindows = [...current.sleepWindows]
  if (start && start < now) sleepWindows.push({ start, end: now })
  const floor = now - MISSED_LOOKBACK_MS
  const scanFrom =
    current.scanFromAt && current.scanFromAt > 0
      ? current.scanFromAt
      : current.lastAliveAt > 0
        ? current.lastAliveAt
        : start
  writeAliveState(io, {
    ...current,
    lastSuspendAt: undefined,
    lastAliveAt: now,
    scanFromAt: scanFrom,
    sleepWindows: sleepWindows.filter((window) => window.end >= floor)
  })
}

export function bindAutomationPowerMonitor(
  hooks: PowerMonitorHooks,
  onResume: () => void
): void {
  unbind?.()
  hooks.onSuspend(() => recordAutomationSuspend())
  hooks.onResume(() => {
    recordAutomationResume()
    onResume()
  })
  unbind = hooks.off
}

export function unbindAutomationPowerMonitor(): void {
  unbind?.()
  unbind = undefined
}

/** 正式进程：electron powerMonitor。测试传入假 hooks。 */
export function electronPowerMonitorHooks(): PowerMonitorHooks {
  const { powerMonitor } = require("electron") as typeof import("electron")
  let suspendFn: (() => void) | undefined
  let resumeFn: (() => void) | undefined
  return {
    onSuspend: (fn) => {
      suspendFn = fn
      powerMonitor.on("suspend", fn)
    },
    onResume: (fn) => {
      resumeFn = fn
      powerMonitor.on("resume", fn)
    },
    off: () => {
      if (suspendFn) powerMonitor.removeListener("suspend", suspendFn)
      if (resumeFn) powerMonitor.removeListener("resume", resumeFn)
    }
  }
}
