/**
 * 创建项目窗只挂一份，避开侧栏重挂把第一次打开吞掉。
 */
import { CreateProjectDialog } from "./create-project-dialog"
import { useCreateProjectStore } from "./create-project-open"

export function CreateProjectHost() {
  const open = useCreateProjectStore((state) => state.open)
  const setOpen = useCreateProjectStore((state) => state.setOpen)
  return <CreateProjectDialog open={open} onOpenChange={setOpen} />
}
