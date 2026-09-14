/**
 * 画布编辑会话：对齐 infinite-canvas project.tsx 的节点/连线/视口/历史。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  CONNECTION_HANDLE_HIT_RADIUS,
  CONNECTION_NODE_HIT_PADDING
} from "../lib/canvas-constants"
import { createCanvasNode } from "../lib/canvas-node-factory"
import {
  applyGroupSelection,
  applyUngroupSelection,
  collectGroupMemberNodes,
  getGroupWrapRect
} from "../lib/canvas-node-geometry"
import type { CanvasBackgroundMode } from "../lib/canvas-theme"
import {
  CanvasNodeType,
  type CanvasConnection,
  type CanvasNodeData,
  type ConnectionHandle,
  type ContextMenuState,
  type Position,
  type SelectionBox,
  type ViewportTransform
} from "../lib/canvas.types"
import { sanitizeConnections } from "../lib/canvas-to-workflow-graph"
import { useCanvasStore } from "../stores/use-canvas-store"
import { useCanvasHistory } from "./use-canvas-history"

export function useCanvasEditor(projectId: string | null) {
  const project = useCanvasStore((state) => state.projects.find((item) => item.id === projectId) ?? null)
  const updateProject = useCanvasStore((state) => state.updateProject)
  const [nodes, setNodes] = useState<CanvasNodeData[]>([])
  const [connections, setConnections] = useState<CanvasConnection[]>([])
  const [viewport, setViewport] = useState<ViewportTransform>({ x: 80, y: 80, k: 1 })
  const [canvasTool, setCanvasTool] = useState<"select" | "pan">("pan")
  const [backgroundMode, setBackgroundMode] = useState<CanvasBackgroundMode>("lines")
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [connectingParams, setConnectingParams] = useState<ConnectionHandle | null>(null)
  const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<string | null>(null)
  const [mouseWorld, setMouseWorld] = useState<Position>({ x: 0, y: 0 })
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodeCreatePosition, setNodeCreatePosition] = useState<Position | null>(null)
  const [pendingConnectionCreate, setPendingConnectionCreate] = useState<{ connection: ConnectionHandle; position: Position } | null>(null)
  const [dialogNodeId, setDialogNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const history = useCanvasHistory()
  const nodesRef = useRef(nodes)
  const connectionsRef = useRef(connections)
  const selectedNodeIdsRef = useRef(selectedNodeIds)
  const viewportRef = useRef(viewport)
  const clipboardRef = useRef<{ nodes: CanvasNodeData[]; connections: CanvasConnection[] } | null>(null)
  nodesRef.current = nodes
  connectionsRef.current = connections
  selectedNodeIdsRef.current = selectedNodeIds
  viewportRef.current = viewport

  useEffect(() => {
    if (!project) return
    const cleanNodes = project.nodes
    const cleanConnections = sanitizeConnections(cleanNodes, project.connections)
    setNodes(cleanNodes)
    setConnections(cleanConnections)
    setViewport(project.viewport)
    setBackgroundMode(project.backgroundMode)
    history.reset()
  }, [project?.id])

  useEffect(() => {
    if (!projectId) return
    const timer = window.setTimeout(() => {
      updateProject(projectId, { nodes, connections, viewport, backgroundMode })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [backgroundMode, connections, nodes, projectId, updateProject, viewport])

  const snapshot = useCallback(() => history.push({ nodes: nodesRef.current, connections: connectionsRef.current }), [history])

  const createNode = useCallback(
    (type: string, position?: Position) => {
      snapshot()
      const center = position ?? screenToWorld(viewportRef.current, window.innerWidth / 2, window.innerHeight / 2, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect)
      const node = createCanvasNode(type, center)
      setNodes((prev) => [...prev, node])
      setSelectedNodeIds(new Set([node.id]))
      setDialogNodeId(type === CanvasNodeType.Group ? null : node.id)
      return node
    },
    [snapshot]
  )

  const deleteNodes = useCallback(
    (ids: Set<string>) => {
      snapshot()
      setNodes((prev) => prev.filter((node) => !ids.has(node.id)))
      setConnections((prev) => prev.filter((item) => !ids.has(item.fromNodeId) && !ids.has(item.toNodeId)))
      setSelectedNodeIds(new Set())
      setDialogNodeId(null)
    },
    [snapshot]
  )

  const connectNodes = useCallback(
    (handle: ConnectionHandle, targetId: string) => {
      const fromId = handle.handleType === "source" ? handle.nodeId : targetId
      const toId = handle.handleType === "source" ? targetId : handle.nodeId
      if (fromId === toId) return
      if (connectionsRef.current.some((item) => item.fromNodeId === fromId && item.toNodeId === toId)) return
      snapshot()
      setConnections((prev) => [...prev, { id: `conn-${fromId}-${toId}`, fromNodeId: fromId, toNodeId: toId }])
    },
    [snapshot]
  )

  const copySelected = useCallback(() => {
    const ids = selectedNodeIdsRef.current
    clipboardRef.current = {
      nodes: nodesRef.current.filter((node) => ids.has(node.id)),
      connections: connectionsRef.current.filter((item) => ids.has(item.fromNodeId) && ids.has(item.toNodeId))
    }
  }, [])

  const pasteCopied = useCallback(() => {
    const clip = clipboardRef.current
    if (!clip?.nodes.length) return false
    snapshot()
    const idMap = new Map(clip.nodes.map((node) => [node.id, `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`]))
    const cloned = clip.nodes.map((node) => ({
      ...node,
      id: idMap.get(node.id)!,
      position: { x: node.position.x + 40, y: node.position.y + 40 }
    }))
    const clonedConns = clip.connections
      .map((item) => {
        const fromNodeId = idMap.get(item.fromNodeId)
        const toNodeId = idMap.get(item.toNodeId)
        if (!fromNodeId || !toNodeId) return null
        return { id: `conn-${fromNodeId}-${toNodeId}`, fromNodeId, toNodeId }
      })
      .filter((item): item is CanvasConnection => Boolean(item))
    const nextNodes = [...nodesRef.current, ...cloned]
    const nextConns = sanitizeConnections(nextNodes, [...connectionsRef.current, ...clonedConns])
    setNodes(nextNodes)
    setConnections(nextConns)
    setSelectedNodeIds(new Set(cloned.map((node) => node.id)))
    return true
  }, [snapshot])

  const undoCanvas = useCallback(() => {
    const prev = history.undo({ nodes, connections })
    if (!prev) return
    setNodes(prev.nodes)
    setConnections(sanitizeConnections(prev.nodes, prev.connections))
  }, [connections, history, nodes])

  const redoCanvas = useCallback(() => {
    const next = history.redo({ nodes, connections })
    if (!next) return
    setNodes(next.nodes)
    setConnections(sanitizeConnections(next.nodes, next.connections))
  }, [connections, history, nodes])

  const groupSelection = useCallback(() => {
    const members = collectGroupMemberNodes(selectedNodeIdsRef.current, nodesRef.current)
    if (members.length < 2) return
    snapshot()
    const rect = getGroupWrapRect(members)
    const created = createCanvasNode(CanvasNodeType.Group, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
    const result = applyGroupSelection(selectedNodeIdsRef.current, nodesRef.current, connectionsRef.current, {
      ...created,
      position: { x: rect.x, y: rect.y },
      width: rect.width,
      height: rect.height
    })
    if (!result) return
    setNodes(result.nodes)
    setConnections(result.connections)
    setSelectedNodeIds(new Set(result.selectedIds))
  }, [snapshot])

  const ungroupSelection = useCallback(() => {
    const result = applyUngroupSelection(selectedNodeIdsRef.current, nodesRef.current, connectionsRef.current)
    if (!result) return
    snapshot()
    setNodes(result.nodes)
    setConnections(result.connections)
    setSelectedNodeIds(new Set(result.selectedIds))
  }, [snapshot])

  return {
    nodes,
    setNodes,
    connections,
    setConnections,
    viewport,
    setViewport,
    canvasTool,
    setCanvasTool,
    backgroundMode,
    setBackgroundMode,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedConnectionId,
    setSelectedConnectionId,
    connectingParams,
    setConnectingParams,
    connectionTargetNodeId,
    setConnectionTargetNodeId,
    mouseWorld,
    setMouseWorld,
    selectionBox,
    setSelectionBox,
    contextMenu,
    setContextMenu,
    nodeCreatePosition,
    setNodeCreatePosition,
    pendingConnectionCreate,
    setPendingConnectionCreate,
    dialogNodeId,
    setDialogNodeId,
    hoveredNodeId,
    setHoveredNodeId,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    snapshot,
    history,
    createNode,
    deleteNodes,
    connectNodes,
    copySelected,
    pasteCopied,
    undoCanvas,
    redoCanvas,
    groupSelection,
    ungroupSelection,
    nodesRef,
    selectedNodeIdsRef,
    viewportRef,
    CONNECTION_HANDLE_HIT_RADIUS,
    CONNECTION_NODE_HIT_PADDING
  }
}

export function screenToWorld(
  viewport: ViewportTransform,
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top">
): Position {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.k,
    y: (clientY - rect.top - viewport.y) / viewport.k
  }
}
