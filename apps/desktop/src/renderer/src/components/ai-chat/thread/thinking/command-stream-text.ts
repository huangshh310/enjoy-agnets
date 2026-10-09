/**
 * 命令输出优先读界面份。旧消息没有 displayStdout 时回落模型份。
 */
export function commandStreamText(
  result: Record<string, unknown>,
  key: "stdout" | "stderr"
): string {
  const displayKey = key === "stdout" ? "displayStdout" : "displayStderr"
  const display = result[displayKey]
  if (typeof display === "string") return display
  const model = result[key]
  return typeof model === "string" ? model : ""
}
