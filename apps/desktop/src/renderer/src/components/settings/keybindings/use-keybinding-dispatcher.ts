/**
 * 全窗口一份快捷键调度。读解析后的表，再调用已登记的处理函数。
 */
import { useEffect, useMemo } from "react"
import { resolveKeybindings, type KeybindingWhen } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { matchAppModule } from "@renderer/components/app-shell/routing/match-module"
import { chordFromKeyboardEvent } from "./keybinding-format"
import { dispatchKeybindingCommand, isKeybindingRecording } from "./keybinding-handlers"

type KeyContext = {
  settingsOrInbox: boolean
  terminalFocus: boolean
  inputFocus: boolean
  composerFocus: boolean
}

export function useKeybindingDispatcher() {
  const { data } = useSettingsSnapshot()
  const rules = useMemo(
    () => resolveKeybindings(data?.preferences.keybindings ?? []),
    [data?.preferences.keybindings]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || isKeybindingRecording()) return
      const chord = chordFromKeyboardEvent(event)
      if (!chord) return
      const context = readKeyContext()
      const hits = rules.filter((rule) => rule.key === chord && whenMatches(rule.when, context))
      const hit = hits.find((rule) => rule.when) ?? hits[0]
      if (!hit || !dispatchKeybindingCommand(hit.command)) return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [rules])
}

function whenMatches(when: KeybindingWhen | undefined, context: KeyContext): boolean {
  if (!when) return true
  if (when === "settingsOrInbox") return context.settingsOrInbox
  if (when === "!terminalFocus") return !context.terminalFocus
  if (when === "!inputFocus") return !context.inputFocus
  if (when === "terminalFocus") return context.terminalFocus
  return context.composerFocus
}

function readKeyContext(): KeyContext {
  const hash = window.location.hash.replace(/^#/, "").split("?")[0] || "/"
  const moduleId = matchAppModule(hash)
  const active = document.activeElement
  const element = active instanceof HTMLElement ? active : null
  const terminalFocus = Boolean(element?.closest(".xterm"))
  const composerFocus = Boolean(element?.closest("[data-composer]"))
  const inputFocus = Boolean(
    active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      element?.isContentEditable ||
      composerFocus
  )
  return {
    settingsOrInbox: moduleId === "settings" || moduleId === "inbox",
    terminalFocus,
    inputFocus,
    composerFocus
  }
}
