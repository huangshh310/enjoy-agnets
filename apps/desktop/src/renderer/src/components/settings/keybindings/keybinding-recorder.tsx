/**
 * 录一条快捷键：Enter 保存，Escape 取消。录制中如果磁盘上的规则变了，提示并且不保存。
 */
import { useEffect, useRef, useState } from "react"
import {
  findChordConflicts,
  rebindKeybinding,
  type KeybindingCommand,
  type KeybindingRule
} from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { metaFor } from "./keybinding-catalog"
import { chordFromKeyboardEvent, chordGlyphs, keybindingPlatform } from "./keybinding-format"
import { setKeybindingRecording } from "./keybinding-handlers"
import { KeybindingKeys } from "./keybinding-keys"

export function KeybindingRecorder({
  command,
  fromKey,
  userRules,
  baseline,
  onSave,
  onCancel
}: {
  command: KeybindingCommand
  fromKey: string | null
  userRules: readonly KeybindingRule[]
  baseline: string
  onSave: (rules: KeybindingRule[]) => void
  onCancel: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState("")
  const [notice, setNotice] = useState("")
  const draftRef = useRef("")
  const rulesRef = useRef(userRules)
  const baselineRef = useRef(baseline)
  const onSaveRef = useRef(onSave)
  const onCancelRef = useRef(onCancel)
  draftRef.current = draft
  rulesRef.current = userRules
  baselineRef.current = baseline
  onSaveRef.current = onSave
  onCancelRef.current = onCancel

  useEffect(() => {
    setKeybindingRecording(true)
    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        onCancelRef.current()
        return
      }
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        void commitDraft()
        return
      }
      const chord = chordFromKeyboardEvent(event)
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

  async function commitDraft() {
    const chord = draftRef.current
    if (!chord) return
    const fresh = await getIde().settings.get()
    if (JSON.stringify(fresh.preferences.keybindings ?? []) !== baselineRef.current) {
      setNotice(t("settings.shortcuts.stale"))
      return
    }
    const result = rebindKeybinding({
      userRules: rulesRef.current,
      command,
      fromKey,
      toKey: chord,
      platform: keybindingPlatform()
    })
    if (!result.ok) {
      setNotice(t(noticeKey(result.code)))
      return
    }
    onSaveRef.current(result.rules)
  }

  const conflicts = draft ? findChordConflicts(userRules, command, draft) : []
  const conflictName = conflicts.map((item) => t(metaFor(item).actionKey)).join("、")

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2 rounded-lg border border-border-focus-ring bg-background-secondary-default px-2 py-1">
        {draft ? <KeybindingKeys chord={draft} /> : <span className="text-caption-2-regular text-text-tertiary">{t("settings.shortcuts.recording")}</span>}
        <span className="text-caption-2-regular text-text-tertiary">{t("settings.shortcuts.recordSave")}</span>
      </div>
      {conflictName ? <p className="max-w-64 text-right text-caption-2-regular text-text-secondary">{t("settings.shortcuts.conflict", { name: conflictName })}</p> : null}
      {notice ? <p className="max-w-64 text-right text-caption-2-regular text-destructive">{notice}</p> : null}
      <span className="sr-only">{chordGlyphs(draft).join(" ")}</span>
    </div>
  )
}

function noticeKey(code: "invalid" | "modifier" | "reserved" | "limit"): string {
  if (code === "reserved") return "settings.shortcuts.reserved"
  if (code === "modifier") return isModifierCopy()
  if (code === "limit") return "settings.shortcuts.tooMany"
  return "settings.shortcuts.invalidChord"
}

function isModifierCopy(): string {
  return keybindingPlatform() === "mac" ? "settings.shortcuts.needsModifier" : "settings.shortcuts.needsModifierWin"
}
