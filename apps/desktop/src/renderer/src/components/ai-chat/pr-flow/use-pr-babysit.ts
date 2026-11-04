/**
 * 盯 PR：经 workspace.prBabysit* 读写 SQLite SoT + 监听 main 叫醒事件。
 * 禁 renderer 直接 gh / 持 token；禁静默开盯。
 */
import { useCallback, useEffect, useState } from "react"
import type { PrBabysitWakeKind, PrBabysitWatchItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

const EVENT = "enjoy:pr-babysit-changed"
const WAKE_EVENT = "enjoy:pr-babysit-wake"

export type BabysitWakePayload = {
  sessionId: string
  number: number
  wakeKind: PrBabysitWakeKind
}

function emitChanged(sessionId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { sessionId } }))
}

export function emitBabysitWake(payload: BabysitWakePayload) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(WAKE_EVENT, { detail: payload }))
}

export function usePrBabysit(sessionId: string | null) {
  const [watching, setWatching] = useState<PrBabysitWatchItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!sessionId || !hasIde()) {
      setWatching([])
      return
    }
    setLoading(true)
    try {
      const res = (await getIde().workspace.prBabysitStatus({ sessionId })) as {
        watching?: PrBabysitWatchItem[]
      }
      setWatching(res?.watching ?? [])
    } catch {
      setWatching([])
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string }>).detail
      if (detail?.sessionId && detail.sessionId !== sessionId) return
      void reload()
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [reload, sessionId])

  useEffect(() => {
    if (!hasIde()) return
    const off = getIde().workspace.onPrBabysit?.((event) => {
      if (sessionId && event.sessionId !== sessionId) return
      emitChanged(event.sessionId)
      if (event.type === "wake" && event.wakeKind) {
        emitBabysitWake({
          sessionId: event.sessionId,
          number: event.number,
          wakeKind: event.wakeKind as PrBabysitWakeKind
        })
        // tip B：persistMessage 已写库 → 前台重读消息，线程出助手短气泡
        void (async () => {
          try {
            const live = useChatStore.getState()
            if (live.sessionId !== event.sessionId || !hasIde()) return
            const rows = (await getIde().session.messages({ sessionId: event.sessionId })) as unknown[]
            if (Array.isArray(rows)) live.setMessages(rows as never)
          } catch (err) {
            console.warn("[pr-babysit] wake message reload failed", err)
          }
        })()
      }
    })
    return () => {
      off?.()
    }
  }, [sessionId])

  const start = useCallback(
    async (input: { workspaceId: string; number: number; url?: string }) => {
      if (!sessionId || !hasIde()) {
        return { ok: false as const, reason: "start-failed" as const, message: "no session" }
      }
      const res = (await getIde().workspace.prBabysitStart({
        sessionId,
        workspaceId: input.workspaceId,
        number: input.number,
        url: input.url ?? ""
      })) as {
        ok: boolean
        reason?: "not-authed" | "not-attached" | "not-git" | "start-failed"
        message?: string
        item?: PrBabysitWatchItem
      }
      await reload()
      emitChanged(sessionId)
      return res
    },
    [reload, sessionId]
  )

  const stop = useCallback(
    async (number: number) => {
      if (!sessionId || !hasIde()) return
      await getIde().workspace.prBabysitStop({ sessionId, number })
      await reload()
      emitChanged(sessionId)
    },
    [reload, sessionId]
  )

  const isWatching = useCallback(
    (number: number) => watching.some((item) => item.number === number),
    [watching]
  )

  return { watching, loading, reload, start, stop, isWatching }
}

export function useBabysitWakeFeed(sessionId: string | null) {
  const [wakes, setWakes] = useState<Array<BabysitWakePayload & { id: string }>>([])

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return
    const onWake = (event: Event) => {
      const detail = (event as CustomEvent<BabysitWakePayload>).detail
      if (!detail || detail.sessionId !== sessionId) return
      setWakes((prev) => [
        ...prev,
        { ...detail, id: `wake-${detail.wakeKind}-${detail.number}-${Date.now()}` }
      ])
    }
    window.addEventListener(WAKE_EVENT, onWake)
    return () => window.removeEventListener(WAKE_EVENT, onWake)
  }, [sessionId])

  useEffect(() => {
    setWakes([])
  }, [sessionId])

  return wakes
}
