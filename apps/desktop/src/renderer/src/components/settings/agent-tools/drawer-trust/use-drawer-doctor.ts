/**
 * 抽屉体检结果：本会话缓存 + 相对时间戳。不在打开时自动跑，避免假绿灯。
 */
import { useEffect, useState } from "react"
import type { AgentToolDoctorResult } from "@enjoy-agents/ipc-contract"
import { readLastDoctor, writeLastDoctor } from "./last-doctor"

export function useDrawerDoctor(toolId: string) {
  const cached = readLastDoctor(toolId)
  const [doctorResult, setDoctorResult] = useState<AgentToolDoctorResult | null>(
    cached?.result ?? null
  )
  const [doctorRanAt, setDoctorRanAt] = useState<number | null>(cached?.ranAt ?? null)

  useEffect(() => {
    const next = readLastDoctor(toolId)
    setDoctorResult(next?.result ?? null)
    setDoctorRanAt(next?.ranAt ?? null)
  }, [toolId])

  function rememberDoctor(result: AgentToolDoctorResult | null) {
    setDoctorResult(result)
    if (!result) {
      setDoctorRanAt(null)
      return
    }
    const ranAt = Date.now()
    setDoctorRanAt(ranAt)
    writeLastDoctor(toolId, result, ranAt)
  }

  return { doctorResult, doctorRanAt, rememberDoctor }
}
