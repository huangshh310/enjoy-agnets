/**
 * 会话挂 PR：经 session.attachedPrs.* 读写 SQLite 旁表 SoT。
 * 多实例（芯片 / 底栏 / 菜单）用 window 事件同步，禁仅内存孤岛。
 */
import { useCallback, useEffect, useState } from "react"
import type { AttachedPrItem, SessionAttachedPrs } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

const EMPTY: SessionAttachedPrs = { primary: null, items: [] }
const EVENT = "enjoy:attached-prs-changed"

function emitAttachedChanged(sessionId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { sessionId } }))
}

export function useAttachedPrs(sessionId: string | null) {
  const [attached, setAttached] = useState<SessionAttachedPrs>(EMPTY)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!sessionId || !hasIde()) {
      setAttached(EMPTY)
      return
    }
    setLoading(true)
    try {
      const next = (await getIde().session.attachedPrsGet({ sessionId })) as SessionAttachedPrs
      setAttached(next?.items ? next : EMPTY)
    } catch {
      setAttached(EMPTY)
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

  const attach = useCallback(
    async (input: {
      workspaceId: string
      number: number
      url: string
      title?: string
      makePrimary?: boolean
    }) => {
      if (!sessionId || !hasIde()) return { ok: false as const }
      const res = (await getIde().session.attachedPrsAttach({
        sessionId,
        workspaceId: input.workspaceId,
        number: input.number,
        url: input.url,
        title: input.title ?? "",
        makePrimary: input.makePrimary ?? true
      })) as { ok: boolean; attached?: SessionAttachedPrs; reason?: string }
      if (res.ok && res.attached) setAttached(res.attached)
      else await reload()
      emitAttachedChanged(sessionId)
      return res
    },
    [reload, sessionId]
  )

  const setPrimary = useCallback(
    async (number: number) => {
      if (!sessionId || !hasIde()) return
      const next = (await getIde().session.attachedPrsSetPrimary({
        sessionId,
        number
      })) as SessionAttachedPrs
      setAttached(next)
      emitAttachedChanged(sessionId)
    },
    [sessionId]
  )

  const replaceAfterCreate = useCallback(
    async (item: AttachedPrItem) => {
      if (!sessionId || !hasIde()) return
      let cur: SessionAttachedPrs = EMPTY
      try {
        cur = (await getIde().session.attachedPrsGet({ sessionId })) as SessionAttachedPrs
      } catch {
        cur = EMPTY
      }
      const items = [item, ...(cur.items ?? []).filter((row) => row.number !== item.number)]
      const next = (await getIde().session.attachedPrsSet({
        sessionId,
        attached: { primary: item.number, items }
      })) as SessionAttachedPrs
      setAttached(next)
      emitAttachedChanged(sessionId)
    },
    [sessionId]
  )

  const primaryItem =
    attached.items.find((item) => item.number === attached.primary) ?? attached.items[0] ?? null
  const extras = attached.items.filter((item) => item.number !== primaryItem?.number)

  return {
    attached,
    primaryItem,
    extras,
    loading,
    reload,
    attach,
    setPrimary,
    replaceAfterCreate
  }
}
