/**
 * 将画布中的节点与连线解析为带有 dependsOn 依赖的有向无环图（DAG）工作流步骤。
 */
import type { WorkflowStepDraft } from "@enjoy-agents/ipc-contract"
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "./canvas.types.ts"
import { stepsFromChain } from "./steps-from-chain.ts"

export type CanvasGraphResult = {
  steps: WorkflowStepDraft[]
  error?: string
  cycleNodes?: string[]
}

/**
 * 将画布节点与连线转换为可执行的 WorkflowStepDraft[] 列表。
 * 如果检测到依赖成环，返回具体成环节点并报错。
 */
export function canvasToWorkflowGraph(
  nodes: CanvasNodeData[],
  connections: CanvasConnection[]
): CanvasGraphResult {
  // 1. 过滤可执行的实体节点（忽略纯布局容器 Group）
  const executableNodes = nodes.filter((n) => n.type !== CanvasNodeType.Group)
  if (executableNodes.length === 0) {
    // 画布为空时，回退到经典默认三步流水线
    return { steps: stepsFromChain("plan>act>verify") }
  }

  if (executableNodes.length > 32) {
    return {
      steps: [],
      error: "工作流节点数量超过上限（单画布最多支持 32 个执行节点）"
    }
  }

  const validIds = new Set(executableNodes.map((n) => n.id))
  const nodeMap = new Map(executableNodes.map((n) => [n.id, n]))

  // 2. 建立邻接表与入度
  // adj: from -> [to1, to2]
  const adj = new Map<string, string[]>()
  // inDeps: to -> [from1, from2]
  const inDeps = new Map<string, string[]>()

  for (const id of validIds) {
    adj.set(id, [])
    inDeps.set(id, [])
  }

  for (const conn of connections) {
    if (validIds.has(conn.fromNodeId) && validIds.has(conn.toNodeId)) {
      if (conn.fromNodeId === conn.toNodeId) {
        return {
          steps: [],
          error: "检测到自环连接",
          cycleNodes: [conn.fromNodeId]
        }
      }
      adj.get(conn.fromNodeId)!.push(conn.toNodeId)
      inDeps.get(conn.toNodeId)!.push(conn.fromNodeId)
    }
  }

  // 3. 拓扑排序与成环检测 (Kahn 算法)
  const inDegree = new Map<string, number>()
  for (const id of validIds) {
    inDegree.set(id, inDeps.get(id)!.length)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id)
  }

  const sortedIds: string[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    sortedIds.push(curr)
    for (const next of adj.get(curr) || []) {
      const nextDeg = inDegree.get(next)! - 1
      inDegree.set(next, nextDeg)
      if (nextDeg === 0) queue.push(next)
    }
  }

  // 若排序后的节点数小于总节点数，说明图中存在回路环 (Cycle)
  if (sortedIds.length < executableNodes.length) {
    const cycleIds = executableNodes
      .map((n) => n.id)
      .filter((id) => !sortedIds.includes(id))
    return {
      steps: [],
      error: "工作流连接线中存在回路环，无法按 DAG 拓扑执行",
      cycleNodes: cycleIds
    }
  }

  // 4. 构建符合契约的 WorkflowStepDraft[]
  const steps: WorkflowStepDraft[] = sortedIds.map((id) => {
    const node = nodeMap.get(id)!
    const prompt =
      node.metadata?.prompt ||
      node.metadata?.content ||
      node.title ||
      getNodeFallbackLabel(node.type)

    return {
      id: node.id,
      label: node.title.trim() || prompt.slice(0, 32) || getNodeFallbackLabel(node.type),
      dependsOn: Array.from(new Set(inDeps.get(id) || []))
    }
  })

  return { steps }
}

function getNodeFallbackLabel(type: string): string {
  if (type === CanvasNodeType.Text) return "文本步骤"
  if (type === CanvasNodeType.Image) return "图像生成"
  if (type === CanvasNodeType.Video) return "视频生成"
  if (type === CanvasNodeType.Audio) return "音频处理"
  if (type === CanvasNodeType.Config) return "配置调度"
  return "工作流步骤"
}
