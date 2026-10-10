/**
 * 连续同质工具聚合成批量节点，避免刷屏。
 */
import type { AgentStepKind, AgentStepNode, BatchFileItem } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import { isGenericVerb } from "./is-generic-verb.ts"
import { groupDelegateRoster } from "./group-delegate-roster.ts"

const BATCH_MIN = 2

export function groupConsecutiveSteps(nodes: AgentStepNode[], t: TranslateFn): AgentStepNode[] {
  const result: AgentStepNode[] = []
  let i = 0
  const rostered = groupDelegateRoster(nodes)
  while (i < rostered.length) {
    const node = rostered[i]!
    const batched = tryBatch(rostered, i, t)
    if (batched) {
      result.push(batched.node)
      i = batched.next
      continue
    }
    const current = { ...node }
    if (current.children && current.children.length > 0) {
      current.children = groupConsecutiveSteps(current.children, t)
    }
    if (current.isRoster && current.rosterItems) {
      current.rosterItems = current.rosterItems.map((item) => {
        if (!item.children || item.children.length === 0) return item
        return {
          ...item,
          children: groupConsecutiveSteps(item.children, t)
        }
      })
    }
    result.push(current)
    i += 1
  }
  return result
}

function tryBatch(
  nodes: AgentStepNode[],
  start: number,
  t: TranslateFn
): { node: AgentStepNode; next: number } | null {
  const head = nodes[start]
  if (!head) return null
  if (head.kind === "delegate" || head.isRoster) return null
  if (head.kind === "editing" || head.kind === "reading" || head.kind === "command" || head.kind === "search") {
    return batchRun(nodes, start, head.kind, t)
  }
  return null
}

function takeRun(
  nodes: AgentStepNode[],
  start: number,
  matches: (node: AgentStepNode) => boolean
): AgentStepNode[] {
  let end = start
  while (end < nodes.length && nodes[end] && matches(nodes[end]!)) end += 1
  return nodes.slice(start, end)
}

function batchStatus(run: AgentStepNode[]): AgentStepNode["status"] {
  if (run.some((n) => n.status === "error")) return "error"
  if (run.some((n) => n.status === "running")) return "running"
  if (run.some((n) => n.status === "denied")) return "denied"
  if (run.some((n) => n.status === "skipped")) return "skipped"
  if (run.some((n) => n.status === "stopped")) return "stopped"
  return "completed"
}

function batchRun(
  nodes: AgentStepNode[],
  start: number,
  kind: AgentStepKind,
  t: TranslateFn
): { node: AgentStepNode; next: number } | null {
  const run = takeRun(nodes, start, (n) => n.kind === kind)
  if (run.length < BATCH_MIN) return null
  const additions = run.reduce((sum, n) => sum + (n.additions ?? 0), 0)
  const deletions = run.reduce((sum, n) => sum + (n.deletions ?? 0), 0)
  const pages = run.flatMap((n) => n.exploredPages ?? [])
  const pills = run.flatMap((n) => n.domainPills ?? [])
  return {
    next: start + run.length,
    node: {
      id: `batch_${kind}_${run[0]!.id}`,
      kind,
      isBatch: true,
      title: batchTitle(kind, run.length, t),
      additions: kind === "editing" && additions > 0 ? additions : undefined,
      deletions: kind === "editing" && deletions > 0 ? deletions : undefined,
      exploredPages: pages.length > 1 ? pages : undefined,
      exploredTitle: pages.length > 1 ? t("chat.exploredPages", { count: pages.length }) : undefined,
      domainPills: pills.length > 0 ? pills : undefined,
      status: batchStatus(run),
      batchItems: run.map((n) => toBatchItem(n, t, batchVerb(kind)))
    }
  }
}

function batchTitle(kind: AgentStepKind, count: number, t: TranslateFn): string {
  if (kind === "editing") return t("chat.batchFilesModified", { count })
  if (kind === "command") return t("chat.batchCommandsRun", { count })
  if (kind === "search") return t("chat.batchSearches", { count })
  return t("chat.batchFilesRead", { count })
}

function batchVerb(kind: AgentStepKind): "verbRun" | "verbEdit" | "verbRead" | "verbFind" {
  if (kind === "command") return "verbRun"
  if (kind === "editing") return "verbEdit"
  if (kind === "search") return "verbFind"
  return "verbRead"
}

function toBatchItem(
  node: AgentStepNode,
  t: TranslateFn,
  verbKey: "verbRun" | "verbEdit" | "verbRead" | "verbFind"
): BatchFileItem {
  const verb = node.actionVerb || t(`chat.${verbKey}`)
  const rawPath = node.filePath || (node.kind === "command" ? node.command : undefined) || ""
  const rawName = node.fileName || (rawPath ? rawPath.split(/[\\/]/).pop() || rawPath : "")
  const isVerb = isGenericVerb(rawName)
  const safeName = !isVerb && rawName ? rawName : rawPath || node.title
  const fallbackLabel = node.kind === "reading" ? t("chat.readingResources") : node.kind === "command" ? t("chat.ranACommand") : verb
  const cleanDisplay = isGenericVerb(safeName) ? (rawPath || fallbackLabel) : safeName
  return {
    id: node.id,
    path: rawPath || cleanDisplay,
    fileName: cleanDisplay,
    fileDir: node.fileDir || "",
    actionVerb: verb,
    additions: node.additions,
    deletions: node.deletions,
    status: node.status
  }
}
