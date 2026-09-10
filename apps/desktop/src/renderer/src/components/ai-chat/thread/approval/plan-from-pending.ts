/**
 * 从本次写盘 / 提交入参抽出 plan 标题和待办。不是会话 Todo Dock。
 */
import { filePathOfArgs, readArg } from "./classify-approval.ts"
import type { ApprovalPlanStep } from "./approval.types"

export function planFromPending(
  name: string,
  args: Record<string, unknown>,
  untitled: string,
  verbs: { write: string; edit: string; commit: string; push: string }
): { headline: string; steps: ApprovalPlanStep[]; showDiff: boolean } {
  if (name === "git_commit") {
    const message = readArg(args, "message") || untitled
    return {
      headline: message,
      steps: [{ id: "commit", title: verbs.commit, detail: message }],
      showDiff: false
    }
  }
  if (name === "git_push") {
    return {
      headline: verbs.push,
      steps: [{ id: "push", title: verbs.push, detail: untitled }],
      showDiff: false
    }
  }
  const path = filePathOfArgs(args) || untitled
  const fileName = path.split("/").pop() || path
  const verb = name === "write_file" || name === "write" ? verbs.write : verbs.edit
  return {
    headline: fileName,
    steps: [{ id: path, title: `${verb} ${fileName}`, detail: path }],
    showDiff: true
  }
}
