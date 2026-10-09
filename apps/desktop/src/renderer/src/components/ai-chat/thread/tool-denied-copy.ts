/**
 * 拒绝审批：对话只写「已拒绝，本次未执行」，不当作出错。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

type Translate = (key: string) => string

export function isDeniedTool(tool: Pick<ThreadToolCall, "state"> | undefined): boolean {
  return tool?.state === "output-denied"
}

export function toolDeniedCopy(t: Translate): string {
  return t("chat.toolDenied")
}
