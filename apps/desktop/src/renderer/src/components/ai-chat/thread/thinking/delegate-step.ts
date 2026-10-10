/**
 * 把 delegate / task 工具调用收成一等公民步骤节点。
 * 不是 Workflow DAG，也不是侧栏会话。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "../../../../lib/record.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import type { AgentStepNode, SubagentKind } from "./agent-step-tree.types.ts"
import { isDeniedTool } from "../tool-denied-copy.ts"
import { mergeToolArgs, mapToolStatus } from "./extract-step-fields.ts"

const TITLE_MAX = 80

/** 输入 ThreadToolCall，输出 kind=delegate 的步骤节点。 */
export function mapDelegateToStepNode(tool: ThreadToolCall, t: TranslateFn): AgentStepNode {
  const args = mergeToolArgs(tool)
  const result = asRecord(tool.result)
  const subagentKind = inferSubagentKind(args)
  const heading = pickDelegateTitle(args)
  const errorText = delegateErrorText(tool, result)
  const status = isDeniedTool(tool)
    ? "denied"
    : errorText || result.error != null || tool.state === "output-error"
      ? "error"
      : mapToolStatus(tool.state, tool)
  return {
    id: tool.id,
    kind: "delegate",
    title: t("chat.subagentTitle", { kind: subagentPersonaLabel(subagentKind, t), title: heading }),
    heading,
    subagentKind,
    status,
    errorText
  }
}

/** errorText 或任意形态 result.error 强制失败。 */
function delegateErrorText(tool: ThreadToolCall, result: Record<string, unknown>): string | undefined {
  if (tool.errorText) return tool.errorText
  if (result.error == null) return undefined
  if (typeof result.error === "string") return result.error
  try {
    return JSON.stringify(result.error)
  } catch {
    return String(result.error)
  }
}

export function subagentPersonaLabel(kind: SubagentKind | undefined, t: TranslateFn): string {
  return kind === "explore" ? t("chat.subagentExplore") : t("chat.subagentGeneral")
}

/** 失败行文案走 chat.subagentFailed，不要复用 chat.failed。 */
export function subagentFailedHint(
  status: AgentStepNode["status"],
  t: TranslateFn
): string | undefined {
  return status === "error" ? t("chat.subagentFailed") : undefined
}

/** args.kind / subagent_type 含 explore|scout → explore，否则 general。 */
export function inferSubagentKind(args: Record<string, unknown>): SubagentKind {
  const raw = String(args.kind ?? args.subagent_type ?? args.subagentType ?? "").toLowerCase()
  return /explore|scout/.test(raw) ? "explore" : "general"
}

/** 标题：args.title → task → description → prompt，截断 80 字。 */
export function pickDelegateTitle(args: Record<string, unknown>): string {
  for (const key of ["title", "task", "description", "prompt"] as const) {
    const value = args[key]
    if (typeof value !== "string") continue
    const text = value.trim()
    if (!text) continue
    return text.length > TITLE_MAX ? text.slice(0, TITLE_MAX) : text
  }
  return ""
}
