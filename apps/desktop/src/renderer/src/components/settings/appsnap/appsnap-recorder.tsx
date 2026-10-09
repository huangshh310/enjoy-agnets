/**
 * 录 AppSnap 快捷键。必须正好两键，其中一键是修饰键。Enter 保存，Escape 取消。
 */
import { useEffect, useRef, useState } from "react"
import { appsnapChordIssue, parseAppsnapChord, type KeybindingCommand } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { metaFor } from "../keybindings/keybinding-catalog"
import { keybindingPlatform } from "../keybindings/keybinding-format"
import { setKeybindingRecording } from "../keybindings/keybinding-handlers"
import { KeybindingKeys } from "../keybindings/keybinding-keys"

const MODIFIER_CODE: Record<string, string> = {
  AltLeft: "alt.left",
  AltRight: "alt.right",
  ControlLeft: "ctrl.left",
  ControlRight: "ctrl.right",
  ShiftLeft: "shift.left",
  ShiftRight: "shift.right",
  MetaLeft: "mod",
  MetaRight: "mod"
}

export function AppsnapRecorder({
  baseline,
  onSave,
  onCancel
}: {
  baseline: string
  onSave: (chord: string) => void
  onCancel: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState("")
  const [notice, setNotice] = useState("")
  const held = useRef<string[]>([])
  const draftRef = useRef("")
  const onSaveRef = useRef(onSave)
  const onCancelRef = useRef(onCancel)
  onSaveRef.current = onSave
  onCancelRef.current = onCancel

  useEffect(() => {
    setKeybindingRecording(true)
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        onCancelRef.current()
        return
      }
      if (event.key === "Enter" && draftRef.current) {
        void commit(draftRef.current)
        return
      }
      const next = pushToken(held.current, event)
      held.current = next
      const chord = parseAppsnapChord(next.join("+"))
      if (!chord) return
      draftRef.current = chord
      setDraft(chord)
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => {
      setKeybindingRecording(false)
      window.removeEventListener("keydown", onKeyDown, true)
    }
  }, [])

  async function commit(chord: string) {
    const fresh = await getIde().settings.get()
    if (JSON.stringify(fresh.preferences.appsnapChord) !== baseline) {
      setNotice(t("settings.shortcuts.stale"))
      return
    }
    const issue = appsnapChordIssue(chord, fresh.preferences.keybindings, keybindingPlatform())
    if (issue?.code === "reserved") {
      setNotice(t(keybindingPlatform() === "mac" ? "settings.shortcuts.reserved" : "settings.shortcuts.needsModifierWin"))
      return
    }
    if (issue?.code === "conflict" && issue.command) {
      setNotice(t("settings.appsnap.conflict", { name: t(metaFor(issue.command as KeybindingCommand).actionKey) }))
      return
    }
    if (issue) {
      setNotice(t("settings.appsnap.needsTwo"))
      return
    }
    onSaveRef.current(chord)
  }

  return (
    <div className="flex flex-col gap-1">
      {draft ? <KeybindingKeys chord={draft} /> : <p className="text-caption-1-medium text-text-secondary">{t("settings.appsnap.recording")}</p>}
      {notice ? <p className="text-caption-2-medium text-destructive">{notice}</p> : null}
    </div>
  )
}

function pushToken(current: string[], event: KeyboardEvent): string[] {
  const side = MODIFIER_CODE[event.code]
  if (side) return current.includes(side) ? current : [...current, side].slice(-2)
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    const mod = event.metaKey ? "mod" : event.ctrlKey ? "ctrl" : event.altKey ? "alt" : "shift"
    const key = event.key.length === 1 ? event.key.toLowerCase() : ""
    return key ? [mod, key] : current
  }
  return current
}
