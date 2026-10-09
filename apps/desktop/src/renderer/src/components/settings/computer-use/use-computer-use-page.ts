/**
 * 电脑操控设置页的状态。总开关、蓝边、本会话任意桌面和始终允许只在这一页改。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { BuiltinToolsState, DesktopComputerUseState, DesktopDoctorReport } from "@enjoy-agents/ipc-contract"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { publishComputerUseEnabled } from "@renderer/hooks/use-computer-use-enabled"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

const EMPTY_DESKTOP: DesktopComputerUseState = {
  enabled: false,
  accessibilityGranted: false,
  screenCaptureGranted: false,
  screenVisuals: true,
  anyDesktopSession: false,
  alwaysAllowApps: []
}

type ToolName = "computerUse" | "screenVisuals" | "anyDesktopSession"
type DesktopSetter = (desktop: DesktopComputerUseState) => void

export type ComputerUseDoctorPhase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; report: DesktopDoctorReport }

type PhaseSetter = (next: ComputerUseDoctorPhase | ((current: ComputerUseDoctorPhase) => ComputerUseDoctorPhase)) => void

export function useComputerUsePage() {
  const queryClient = useQueryClient()
  const sessionId = useChatStore((store) => store.sessionId)
  const prefs = useSettingsSnapshot().data?.preferences
  const [desktop, setDesktop] = useState<DesktopComputerUseState>(EMPTY_DESKTOP)
  const [doctorPhase, setDoctorPhase] = useState<ComputerUseDoctorPhase>({ kind: "loading" })
  const writes = useRef(0)

  const load = useCallback(() => {
    const seen = writes.current
    return loadComputerUse(sessionId, setDesktop, setDoctorPhase, () => writes.current === seen)
  }, [sessionId])

  useEffect(() => {
    void load()
    const onFocus = () => {
      void load()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [load])

  const toggleTool = useCallback((tool: ToolName, enabled: boolean) => {
    // 无焦点会话时 main 不写会话表。这里不发 IPC，避免开关看起来能开。
    if (tool === "anyDesktopSession" && !sessionId?.trim()) return
    const seq = ++writes.current
    void applyToolToggle(tool, enabled, sessionId, setDesktop, () => claimWrite(writes, seq))
  }, [sessionId])

  const savePrefs = useCallback(async (patch: Parameters<typeof patchPreferences>[0]) => {
    await patchPreferences(patch)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }, [queryClient])

  const restore = useCallback(async () => {
    const seq = ++writes.current
    await applyToolToggle("computerUse", false, sessionId, setDesktop, () => claimWrite(writes, seq))
    await savePrefs({
      computerUsePointer: "stock",
      computerUsePreview: true,
      computerUsePreviewSize: "compact",
      desktopAdvancedCoords: false
    })
  }, [savePrefs, sessionId])

  const revoke = useCallback((appKey: string) => {
    void revokeAlwaysAllow(appKey, sessionId, setDesktop)
  }, [sessionId])

  return { desktop, doctorPhase, sessionId, prefs, load, toggleTool, savePrefs, restore, revoke }
}

async function loadComputerUse(
  sessionId: string | null,
  setDesktop: DesktopSetter,
  setPhase: PhaseSetter,
  stillCurrent: () => boolean
) {
  if (!hasIde()) return
  const state = (await getIde().builtinTools.getState(sessionId ? { sessionId } : undefined)) as BuiltinToolsState
  if (!stillCurrent()) return
  setDesktop(state.computerUse)
  publishComputerUseEnabled(state.computerUse.enabled)
  try {
    const report = (await getIde().builtinTools.desktopDoctor()) as DesktopDoctorReport
    if (!stillCurrent()) return
    setPhase({ kind: "ready", report })
  } catch {
    if (!stillCurrent()) return
    setPhase((current) => (current.kind === "ready" ? current : { kind: "error" }))
  }
}

async function applyToolToggle(
  tool: ToolName,
  enabled: boolean,
  sessionId: string | null,
  setDesktop: DesktopSetter,
  stillCurrent: () => boolean
) {
  if (!hasIde()) return
  const next = (await getIde().builtinTools.toggle({
    tool,
    enabled,
    sessionId: sessionId ?? undefined
  })) as BuiltinToolsState
  if (!stillCurrent()) return
  setDesktop(next.computerUse)
  if (tool === "computerUse") publishComputerUseEnabled(next.computerUse.enabled)
}

function claimWrite(writes: { current: number }, seq: number): boolean {
  if (writes.current !== seq) return false
  writes.current += 1
  return true
}

async function revokeAlwaysAllow(appKey: string, sessionId: string | null, setDesktop: DesktopSetter) {
  if (!hasIde() || !appKey.trim()) return
  const next = (await getIde().builtinTools.revokeAlwaysAllow({
    appKey,
    sessionId: sessionId ?? undefined
  })) as BuiltinToolsState
  setDesktop(next.computerUse)
}
