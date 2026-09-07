/**
 * 自动更新 UI 快照。事件来自 main 的 app.update 推送。
 */
import { create } from "zustand"
import type { AppUpdateSnapshot } from "@enjoy-agents/ipc-contract"

const EMPTY: AppUpdateSnapshot = { status: "idle", currentVersion: "" }

type AppUpdateStore = {
  snapshot: AppUpdateSnapshot
  dialogOpen: boolean
  setSnapshot: (snapshot: AppUpdateSnapshot) => void
  setDialogOpen: (dialogOpen: boolean) => void
}

export const useAppUpdateStore = create<AppUpdateStore>((set) => ({
  snapshot: EMPTY,
  dialogOpen: false,
  setSnapshot: (snapshot) => set({ snapshot }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen })
}))
