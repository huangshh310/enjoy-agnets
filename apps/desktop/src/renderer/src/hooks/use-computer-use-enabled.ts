/**
 * 渲染进程只读 Computer Use 开关，不碰权限细节。
 * Chat 用 hidden 保活，设置页改开关后必须广播，不能只在挂载时读一次。
 *
 * 共享读（#228 leo M1）：模块里存最近一次已知值，所有订阅者共用；一个窗口最多一次 builtinTools.getState()
 * （进行中的读去重，结果大家共享），之后只靠 enjoy:computer-use-changed 事件更新。
 * 这样 chip 重新挂载时首帧就是已知值（不会先画「关」再变「开」），底栏选级探测量到的宽度也就是真实宽度。
 * 只读：不新增写 IPC，不改 main / preload / IPC 契约。读失败不缓存，下次挂载再试（与改前每次挂载都读的容错一致）。
 */
import { useEffect, useSyncExternalStore } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"

const COMPUTER_USE_ENABLED_EVENT = "enjoy:computer-use-changed"

let known: boolean | null = null
let inflight: Promise<void> | null = null
let windowListening = false
const listeners = new Set<() => void>()

function setKnown(next: boolean): void {
  if (known === next) return
  known = next
  for (const l of listeners) l()
}

function onWindowChange(event: Event): void {
  const detail = (event as CustomEvent<boolean>).detail
  if (typeof detail === "boolean") setKnown(detail)
}

function ensureWindowListener(): void {
  if (windowListening || typeof window === "undefined") return
  windowListening = true
  window.addEventListener(COMPUTER_USE_ENABLED_EVENT, onWindowChange)
}

function ensureRead(): void {
  if (known !== null || inflight || !hasIde()) return
  inflight = readEnabled().then((next) => {
    inflight = null
    // 读的途中若已收到广播，以广播为准（更新）。
    if (next !== null && known === null) setKnown(next)
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return known ?? false
}

export function publishComputerUseEnabled(enabled: boolean): void {
  window.dispatchEvent(new CustomEvent(COMPUTER_USE_ENABLED_EVENT, { detail: enabled }))
}

export function useComputerUseEnabled() {
  // 渲染期只挂监听（幂等、只读），保证首个订阅者挂载前的广播也不丢。
  ensureWindowListener()
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    ensureRead()
  }, [])
  return enabled
}

async function readEnabled(): Promise<boolean | null> {
  try {
    const state = await getIde().builtinTools.getState()
    return state.computerUse.enabled
  } catch {
    return null
  }
}
