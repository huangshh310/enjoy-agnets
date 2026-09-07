/**
 * 标题栏芯片是否出现：有可下的版本、正在下、或已下完待重启。
 */
import type { AppUpdateStatus } from "@enjoy-agents/ipc-contract"

export function showsUpdateChip(status: AppUpdateStatus): boolean {
  return status === "available" || status === "downloading" || status === "ready"
}
