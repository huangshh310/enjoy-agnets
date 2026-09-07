/**
 * 窗口级更新宿主：订阅 IPC，并挂上发行说明对话框。
 */
import { AppUpdateDialog } from "./app-update-dialog"
import { useAppUpdateBridge } from "./use-app-update-bridge"

export function AppUpdateHost() {
  useAppUpdateBridge()
  return <AppUpdateDialog />
}
