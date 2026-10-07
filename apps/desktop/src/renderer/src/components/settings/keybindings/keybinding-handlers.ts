/**
 * 调度器只认命令名。各处处理函数在这里登记，不再自己比较按键。
 */
import { useEffect, useRef } from "react"
import type { KeybindingCommand } from "@enjoy-agents/ipc-contract"

const handlers = new Map<KeybindingCommand, () => boolean>()
let recording = false

export function setKeybindingRecording(active: boolean) {
  recording = active
}

export function isKeybindingRecording(): boolean {
  return recording
}

export function dispatchKeybindingCommand(command: KeybindingCommand): boolean {
  return handlers.get(command)?.() ?? false
}

/** 登记一条命令。返回 false 表示这次按键没被吃掉。 */
export function useKeybindingCommand(command: KeybindingCommand, run: () => boolean) {
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    const wrapped = () => runRef.current()
    handlers.set(command, wrapped)
    return () => {
      if (handlers.get(command) === wrapped) handlers.delete(command)
    }
  }, [command])
}
