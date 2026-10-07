/**
 * 循环审批风险档：allow-reads → allow-edits → allow-all。
 * 键由调度器决定，默认是输入框外的 Shift+Tab。
 */
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"
import { cyclePermissionMode, flagsForPolicy } from "./approval-policy"

export function usePermissionCycleHotkey() {
  const { kind, persist } = useApprovalPolicyEditor()
  useKeybindingCommand("chat.permission.cycle", () => {
    const currentMode = kind === "custom" ? "allow-reads" : kind
    void persist(flagsForPolicy(cyclePermissionMode(currentMode)))
    return true
  })
}
