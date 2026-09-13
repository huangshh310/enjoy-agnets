/**
 * SHIFT+TAB 循环切换审批风险档 (Craft 灵感)：
 * allow-reads -> allow-edits -> allow-all -> allow-reads。
 * 当焦点不在输入控件时生效。
 */
import { useEffect } from "react"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"
import { cyclePermissionMode, flagsForPolicy } from "./approval-policy"

export function usePermissionCycleHotkey() {
  const { kind, persist } = useApprovalPolicyEditor()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !event.shiftKey) return
      const active = document.activeElement
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      if (isInput) return

      event.preventDefault()
      const currentMode = kind === "custom" ? "allow-reads" : kind
      const nextMode = cyclePermissionMode(currentMode)
      void persist(flagsForPolicy(nextMode))
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [kind, persist])
}
