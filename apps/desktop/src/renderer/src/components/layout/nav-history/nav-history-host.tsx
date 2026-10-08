/**
 * 挂一次历史同步和窗口级输入。按钮在标题栏，不在这里画。
 */
import { useNavHistoryInput } from "./use-nav-history-input"
import { useNavHistorySync } from "./use-nav-history-sync"

export function NavHistoryHost() {
  useNavHistorySync()
  useNavHistoryInput()
  return null
}
