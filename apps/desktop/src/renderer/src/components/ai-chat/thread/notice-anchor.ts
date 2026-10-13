/**
 * 中性提示（重启后已中断 / 已停止）挂在哪一轮下面。
 * notice 只记会话最近一轮 run 的结局（runs.error 回灌），所以锚到最后一条助手消息；
 * 最后一条不是助手（还没回话就停了）时返回 null，退回线程末尾。
 */
export function noticeAnchorId(
  visible: ReadonlyArray<{ id: string; role: string }>,
  notice: string | null
): string | null {
  if (!notice) return null
  const last = visible.at(-1)
  return last?.role === "assistant" ? last.id : null
}
