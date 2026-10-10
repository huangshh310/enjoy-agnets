/**
 * 打开创建项目窗。首次点击被 Dialog 外点或侧栏重挂吞掉：
 * pointerdown 先 preventDefault，状态放在壳层 store，不跟侧栏一起卸。
 */
import { create } from "zustand"

type CreateProjectState = {
  open: boolean
  show: () => void
  hide: () => void
  setOpen: (open: boolean) => void
}

export const useCreateProjectStore = create<CreateProjectState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  setOpen: (open) => set({ open })
}))

export function requestCreateProject(event?: {
  button?: number
  preventDefault: () => void
  stopPropagation?: () => void
}): void {
  if (event) {
    if (event.button != null && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation?.()
  }
  queueMicrotask(() => {
    useCreateProjectStore.getState().show()
  })
}
