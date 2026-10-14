/**
 * Shift+Tab 只在读取 / 编辑之间切；全部只能下手选，从全部回到读取。
 * 只在焦点在空 Composer 时切档并弹 toast；Composer 有字或焦点在别处则让出，做焦点后退。
 */
import { isTerminalKeyTarget } from "@renderer/components/ai-chat/right-pane/views/terminal/terminal-focus"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useChatStore } from "@renderer/stores/chat-store"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"
import { cyclePermissionMode, flagsForPolicy } from "./approval-policy"
import { composerInputEmpty, permissionCycledMessage, shouldCyclePermissionOnShiftTab } from "./permission-cycle"
import { showAppToast } from "@renderer/lib/app-toast"
import { useT } from "@renderer/i18n"

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
  const t = useT()
  const { kind, persist } = useApprovalPolicyEditor()
  useKeybindingCommand("chat.permission.cycle", () => {
    if (!shouldCyclePermissionOnShiftTab(readCycleContext())) return false
    const currentMode = kind === "custom" ? "allow-reads" : kind
    const next = cyclePermissionMode(currentMode)
    void persist(flagsForPolicy(next))
    showAppToast(permissionCycledMessage(next, t), { id: "permission-cycled", testId: "permission-cycled-toast" })
    return true
  })
}
