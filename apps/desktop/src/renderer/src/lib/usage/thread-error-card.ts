/**
 * 红卡（ThreadErrorBanner）是否真的画出来：线程 / 空会话挂载与「需处理」条去重共用这一个判断（leo #151）。
 * 灰条（上一条还在准备）、停止 / 追帧超时、缺路由 / 缺模型提示都不算红卡。
 */
import { classifyThreadError, PREVIOUS_STILL_PREPARING } from "./classify-thread-error"

export function threadErrorCardVisible(error: string | null | undefined): boolean {
  if (!error || error === PREVIOUS_STILL_PREPARING) return false
  const kind = classifyThreadError(error)
  return kind !== "stopped" && kind !== "catch_up_timeout" && kind !== "no_chat_route" && kind !== "needs_model"
}
