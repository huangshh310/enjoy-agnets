/**
 * 循环审批风险档：allow-reads → allow-edits → allow-all。
 * Shift+Tab：空 Composer 或焦点不在其它输入框时切档；Composer 有字则让出焦点后退。
 */
import { isTerminalKeyTarget } from "@renderer/components/ai-chat/right-pane/views/terminal/terminal-focus"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useChatStore } from "@renderer/stores/chat-store"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"
import { cyclePermissionMode, flagsForPolicy } from "./approval-policy"
import { composerInputEmpty, shouldCyclePermissionOnShiftTab } from "./permission-cycle"

export { composerInputEmpty, shouldCyclePermissionOnShiftTab } from "./permission-cycle"

function readCycleContext(): {
  composerEmpty: boolean
  composerFocus: boolean
  inputFocus: boolean
  terminalFocus: boolean
} {
  const active = typeof document === "undefined" ? null : document.activeElement
  const element = active instanceof HTMLElement ? active : null
  const composerFocus = Boolean(element?.closest("[data-composer]"))
  const inputFocus = Boolean(
    active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      element?.isContentEditable ||
      composerFocus
  )
  return {
    composerEmpty: composerInputEmpty(
      typeof document === "undefined" ? null : document,
      useChatStore.getState().composer
    ),
    composerFocus,
    inputFocus,
    terminalFocus: isTerminalKeyTarget(element)
  }
}

export function usePermissionCycleHotkey() {
  const { kind, persist } = useApprovalPolicyEditor()
  useKeybindingCommand("chat.permission.cycle", () => {
    if (!shouldCyclePermissionOnShiftTab(readCycleContext())) return false
    const currentMode = kind === "custom" ? "allow-reads" : kind
    void persist(flagsForPolicy(cyclePermissionMode(currentMode)))
    return true
  })
}
