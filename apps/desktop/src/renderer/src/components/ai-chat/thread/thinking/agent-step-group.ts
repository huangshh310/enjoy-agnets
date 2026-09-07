/**
 * 连续编辑 / 阅读 / 命令聚合成批量节点，避免刷屏。
 */
import type { AgentStepNode, BatchFileItem } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"

const BATCH_MIN = 2

export function groupConsecutiveSteps(nodes: AgentStepNode[], t: TranslateFn): AgentStepNode[] {
  const result: AgentStepNode[] = []
  let i = 0
  while (i < nodes.length) {
    const node = nodes[i]!
    const batched = tryBatch(nodes, i, t)
    if (batched) {
      result.push(batched.node)
      i = batched.next
      continue
    }
    result.push(node)
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
  if (head.kind === "editing") return batchRun(nodes, start, "editing", t)
  if (head.kind === "reading" || head.kind === "search") {
    return batchExplore(nodes, start, t)
  }
  if (head.kind === "command") return batchRun(nodes, start, "command", t)
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
  return "completed"
}

function batchRun(
  nodes: AgentStepNode[],
  start: number,
  kind: "editing" | "command",
  t: TranslateFn
): { node: AgentStepNode; next: number } | null {
  const run = takeRun(nodes, start, (n) => n.kind === kind)
  if (run.length < BATCH_MIN) return null
  const additions = run.reduce((sum, n) => sum + (n.additions ?? 0), 0)
  const deletions = run.reduce((sum, n) => sum + (n.deletions ?? 0), 0)
  const pills = run.flatMap((n) => n.domainPills ?? [])
  return {
    next: start + run.length,
    node: {
      id: `batch_${kind}_${run[0]!.id}`,
      kind,
      isBatch: true,
      title:
        kind === "editing"
          ? t("chat.batchFilesModified", { count: run.length })
          : t("chat.batchCommandsRun", { count: run.length }),
      additions: kind === "editing" && additions > 0 ? additions : undefined,
      deletions: kind === "editing" && deletions > 0 ? deletions : undefined,
      domainPills: pills.length > 0 ? pills : undefined,
      status: batchStatus(run),
      batchItems: run.map((n) => toBatchItem(n, t, kind === "command" ? "verbRun" : "verbEdit"))
    }
  }
}

function batchExplore(
  nodes: AgentStepNode[],
  start: number,
  t: TranslateFn
): { node: AgentStepNode; next: number } | null {
  const run = takeRun(nodes, start, (n) => n.kind === "reading" || n.kind === "search")
  if (run.length < BATCH_MIN) return null
  const readCount = run.filter((n) => n.kind === "reading").length
  const pages = run.flatMap((n) => n.exploredPages ?? [])
  const pills = run.flatMap((n) => n.domainPills ?? [])
  return {
    next: start + run.length,
    node: {
      id: `batch_explore_${run[0]!.id}`,
      kind: "reading",
      isBatch: true,
      title: t("chat.batchFilesRead", { count: readCount || run.length }),
      status: batchStatus(run),
      exploredPages: pages.length > 1 ? pages : undefined,
      exploredTitle: pages.length > 1 ? t("chat.exploredPages", { count: pages.length }) : undefined,
      domainPills: pills.length > 0 ? pills : undefined,
      batchItems: run.map((n) =>
        toBatchItem(n, t, n.kind === "search" ? "verbFind" : "verbRead")
      )
    }
  }
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

function isGenericVerb(text: string): boolean {
  return /^(编辑|写入|读取|创建|修改|删除|运行|edit|write|read|create|modify|delete|run|file|folder|command)$/i.test(text.trim())
}
