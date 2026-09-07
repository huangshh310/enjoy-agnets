/**
 * 订阅 main 的更新快照。挂载只拉 status，不触发 check，以免冲掉 12s 延迟。
 */
import { useEffect } from "react"
import { parseAppUpdateSnapshot } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAppUpdateStore } from "@renderer/stores/app-update-store"

export function useAppUpdateBridge(): void {
  const setSnapshot = useAppUpdateStore((state) => state.setSnapshot)
  const snapshot = useAppUpdateStore((state) => state.snapshot)

  useEffect(() => {
    if (!hasIde()) return
    const apply = (raw: unknown) => {
      const parsed = parseAppUpdateSnapshot(raw)
      if (parsed) setSnapshot(parsed)
    }
    const stop = getIde().app.onUpdate(apply)
    void getIde().app.updateStatus({}).then(apply).catch(() => undefined)
    return () => {
      stop()
    }
  }, [setSnapshot])

  useEffect(() => {
    if (snapshot.status !== "ready" || !hasIde()) return
    void getIde().app.installUpdate({}).catch(() => undefined)
  }, [snapshot.status])
}
