/**
 * Shift+Tab 只在读取 / 编辑之间切；全部只能下手选，从全部回到读取。
 * 只在焦点就在空的 Composer 输入框（无附件 / Chip、非组字）时切档，写入成功后弹 toast；否则让出，做焦点后退。
 */
import { isTerminalKeyTarget } from "@renderer/components/ai-chat/right-pane/views/terminal/terminal-focus"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useChatStore } from "@renderer/stores/chat-store"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"
import { cyclePermissionMode, flagsForPolicy } from "./approval-policy"
import {
  composerInputEmpty,
  isComposerInputElement,
  permissionCycledMessage,
  permissionCycleFailedMessage,
  runPermissionCycle,
  shouldCyclePermissionOnShiftTab
} from "./permission-cycle"
import { useEffect } from "react"
import { listComposerAssets } from "@renderer/hooks/composer-assets"
import { listSessionContextChips } from "@renderer/hooks/session-context-chips"
import { listQuotedContexts } from "@renderer/hooks/quoted-context"
import { listComposerSkillChips } from "./composer/mentions/composer-skill-chips"
import { showAppToast } from "@renderer/lib/app-toast"
import { useT } from "@renderer/i18n"

export { composerInputEmpty, shouldCyclePermissionOnShiftTab } from "./permission-cycle"

// 最近一次按键是否在输入法组字中（keybinding 处理函数拿不到事件，捕获阶段记一下；leo #154 S1）。
let lastKeyComposing = false

function hasComposerExtras(): boolean {
  return (
    listComposerAssets().length > 0 ||
    listSessionContextChips().length > 0 ||
    listQuotedContexts().length > 0 ||
    listComposerSkillChips().length > 0
  )
}

function readCycleContext() {
  const active = typeof document === "undefined" ? null : document.activeElement
  const element = active instanceof HTMLElement ? active : null
  return {
    composerFocus: isComposerInputElement(element),
    composerEmpty: composerInputEmpty(
      typeof document === "undefined" ? null : document,
      useChatStore.getState().composer
    ),
    hasExtras: hasComposerExtras(),
    composing: lastKeyComposing,
    terminalFocus: isTerminalKeyTarget(element)
  }
}

export function usePermissionCycleHotkey() {
  const t = useT()
  const { kind, persist } = useApprovalPolicyEditor()
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      lastKeyComposing = event.isComposing || event.keyCode === 229
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [])
  useKeybindingCommand("chat.permission.cycle", () => {
    if (!shouldCyclePermissionOnShiftTab(readCycleContext())) return false
    const currentMode = kind === "custom" ? "allow-reads" : kind
    const next = cyclePermissionMode(currentMode)
    // 先写入，成功后再提示；失败提示没切成，权限保持原样（leo #154 B1）。
    void runPermissionCycle(() => persist(flagsForPolicy(next)), {
      ok: () =>
        showAppToast(permissionCycledMessage(next, t), { id: "permission-cycled", testId: "permission-cycled-toast" }),
      failed: () =>
        showAppToast(permissionCycleFailedMessage(t), {
          id: "permission-cycled",
          testId: "permission-cycle-failed-toast",
          tone: "error"
        })
    })
    return true
  })
}
