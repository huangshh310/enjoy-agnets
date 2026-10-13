/**
 * 换会话时红卡归属：换到别的会话且不在跑 → 清掉上一会话的；同会话 / 在跑不动。
 * 还原交给 #150 restoreSessionErrorFromDb（runs 表 lastError + 关闭水位）。
 */
export function shouldClearErrorOnSwitch(input: { sameSession: boolean; running: boolean }): boolean {
  return !input.sameSession && !input.running
}
