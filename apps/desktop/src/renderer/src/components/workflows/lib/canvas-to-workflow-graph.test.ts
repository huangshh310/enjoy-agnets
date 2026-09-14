import test from "node:test"
import assert from "node:assert/strict"
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "./canvas.types.ts"
import { canvasToWorkflowGraph, sanitizeConnections } from "./canvas-to-workflow-graph.ts"

test("canvasToWorkflowGraph - 空画布回退到默认配方", () => {
  const result = canvasToWorkflowGraph([], [])
  assert.equal(result.steps.length, 3)
  assert.equal(result.steps[0].id, "plan")
  assert.equal(result.steps[1].id, "act")
  assert.equal(result.steps[2].id, "verify")
})

test("canvasToWorkflowGraph - 线性连线 A -> B -> C 正确解析 dependsOn", () => {
  const nodes: CanvasNodeData[] = [
    { id: "node_a", type: CanvasNodeType.Text, title: "设计计划", position: { x: 0, y: 0 }, width: 100, height: 100 },
    { id: "node_b", type: CanvasNodeType.Text, title: "编写代码", position: { x: 200, y: 0 }, width: 100, height: 100 },
    { id: "node_c", type: CanvasNodeType.Text, title: "单元测试", position: { x: 400, y: 0 }, width: 100, height: 100 }
  ]
  const connections: CanvasConnection[] = [
    { id: "c1", fromNodeId: "node_a", toNodeId: "node_b" },
    { id: "c2", fromNodeId: "node_b", toNodeId: "node_c" }
  ]

  const result = canvasToWorkflowGraph(nodes, connections)
  assert.equal(result.steps.length, 3)
  assert.equal(result.steps[0].id, "node_a")
  assert.deepEqual(result.steps[0].dependsOn, [])
  assert.equal(result.steps[1].id, "node_b")
  assert.deepEqual(result.steps[1].dependsOn, ["node_a"])
  assert.equal(result.steps[2].id, "node_c")
  assert.deepEqual(result.steps[2].dependsOn, ["node_b"])
})

test("canvasToWorkflowGraph - 检测回路环并返回错误", () => {
  const nodes: CanvasNodeData[] = [
    { id: "node_a", type: CanvasNodeType.Text, title: "A", position: { x: 0, y: 0 }, width: 100, height: 100 },
    { id: "node_b", type: CanvasNodeType.Text, title: "B", position: { x: 200, y: 0 }, width: 100, height: 100 }
  ]
  const connections: CanvasConnection[] = [
    { id: "c1", fromNodeId: "node_a", toNodeId: "node_b" },
    { id: "c2", fromNodeId: "node_b", toNodeId: "node_a" }
  ]

  const result = canvasToWorkflowGraph(nodes, connections)
  assert.ok(result.error)
  assert.ok(result.cycleNodes && result.cycleNodes.length > 0)
  assert.equal(result.steps.length, 0)
})

test("sanitizeConnections - 净化孤立连线与自环", () => {
  const nodes: CanvasNodeData[] = [
    { id: "n1", type: CanvasNodeType.Text, title: "1", position: { x: 0, y: 0 }, width: 100, height: 100 },
    { id: "n2", type: CanvasNodeType.Text, title: "2", position: { x: 100, y: 0 }, width: 100, height: 100 }
  ]
  const dirtyConnections: CanvasConnection[] = [
    { id: "c1", fromNodeId: "n1", toNodeId: "n2" },
    { id: "c2", fromNodeId: "n1", toNodeId: "n999_missing" },
    { id: "c3", fromNodeId: "n888_missing", toNodeId: "n2" },
    { id: "c4", fromNodeId: "n1", toNodeId: "n1" }
  ]

  const cleaned = sanitizeConnections(nodes, dirtyConnections)
  assert.equal(cleaned.length, 1)
  assert.equal(cleaned[0].id, "c1")
})
