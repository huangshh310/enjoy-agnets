/**
 * 指针交互：对齐 infinite-canvas project.tsx 框选 / 拖节点 / 拉线。
 */
import { useCallback, useEffect, useRef } from "react"
import { CONNECTION_HANDLE_HIT_RADIUS, CONNECTION_NODE_HIT_PADDING } from "../lib/canvas-constants"
import { CanvasNodeType, type CanvasNodeData, type Position } from "../lib/canvas.types"
import type { useCanvasEditor } from "./use-canvas-editor"

type Editor = ReturnType<typeof useCanvasEditor>

export function useCanvasPointer({
  editor,
  worldOf
}: {
  editor: Editor
  worldOf: (clientX: number, clientY: number) => Position
}) {
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef({
    isDraggingNode: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialSelectedNodes: [] as { id: string; x: number; y: number }[]
  })
  const pendingSelectionRef = useRef<Set<string> | null>(null)
  const connectingRef = useRef(editor.connectingParams)
  connectingRef.current = editor.connectingParams
  const selectionBoxRef = useRef(editor.selectionBox)
  selectionBoxRef.current = editor.selectionBox

  const handleCanvasMouseDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      editor.setContextMenu(null)
      editor.setNodeCreatePosition(null)
      if (event.button !== 0) return
      const world = worldOf(event.clientX, event.clientY)
      const box = {
        startWorldX: world.x,
        startWorldY: world.y,
        currentWorldX: world.x,
        currentWorldY: world.y,
        additive: event.shiftKey,
        initialSelectedNodeIds: event.shiftKey ? Array.from(editor.selectedNodeIdsRef.current) : []
      }
      editor.setSelectionBox(box)
      if (!event.shiftKey) editor.setSelectedNodeIds(new Set())
      editor.setSelectedConnectionId(null)
    },
    [editor, worldOf]
  )

  const selectNodeByEvent = useCallback(
    (event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }, nodeId: string) => {
      const next = new Set(editor.selectedNodeIdsRef.current)
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        if (next.has(nodeId)) next.delete(nodeId)
        else next.add(nodeId)
      } else if (!next.has(nodeId)) {
        next.clear()
        next.add(nodeId)
      }
      editor.setSelectedNodeIds(next)
      return next
    },
    [editor]
  )

  const handleNodeSelectCapture = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      if (event.button !== 0) return
      editor.setContextMenu(null)
      pendingSelectionRef.current = selectNodeByEvent(event, nodeId)
    },
    [editor, selectNodeByEvent]
  )

  const handleNodeMouseDown = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      event.stopPropagation()
      const nextSelected = pendingSelectionRef.current ?? selectNodeByEvent(event, nodeId)
      pendingSelectionRef.current = null
      const dragIds = new Set(nextSelected)
      editor.nodesRef.current.forEach((node) => {
        if (!nextSelected.has(node.id)) return
        if (node.type === CanvasNodeType.Group) {
          editor.nodesRef.current.forEach((child) => {
            if (child.metadata?.groupId === node.id) dragIds.add(child.id)
          })
        }
      })
      dragRef.current = {
        isDraggingNode: true,
        hasMoved: false,
        startX: event.clientX,
        startY: event.clientY,
        initialSelectedNodes: editor.nodesRef.current
          .filter((node) => dragIds.has(node.id))
          .map((node) => ({ id: node.id, x: node.position.x, y: node.position.y }))
      }
    },
    [editor, selectNodeByEvent]
  )

  const handleConnectStart = useCallback(
    (event: React.MouseEvent, nodeId: string, handleType: "source" | "target") => {
      event.stopPropagation()
      editor.setMouseWorld(worldOf(event.clientX, event.clientY))
      editor.setConnectingParams({ nodeId, handleType })
      editor.setConnectionTargetNodeId(null)
    },
    [editor, worldOf]
  )

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (dragRef.current.isDraggingNode) {
        const dx = (event.clientX - dragRef.current.startX) / editor.viewportRef.current.k
        const dy = (event.clientY - dragRef.current.startY) / editor.viewportRef.current.k
        if (Math.abs(event.clientX - dragRef.current.startX) > 3 || Math.abs(event.clientY - dragRef.current.startY) > 3) {
          dragRef.current.hasMoved = true
        }
        const initial = dragRef.current.initialSelectedNodes
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          editor.setNodes((prev) =>
            prev.map((node) => {
              const start = initial.find((item) => item.id === node.id)
              return start ? { ...node, position: { x: Math.round(start.x + dx), y: Math.round(start.y + dy) } } : node
            })
          )
          rafRef.current = null
        })
        return
      }
      if (connectingRef.current) {
        editor.setMouseWorld(worldOf(event.clientX, event.clientY))
        editor.setConnectionTargetNodeId(hitNode(editor.nodesRef.current, worldOf(event.clientX, event.clientY), connectingRef.current.nodeId)?.id ?? null)
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      const box = selectionBoxRef.current
      if (!box) return
      const world = worldOf(event.clientX, event.clientY)
      const rectX = Math.min(box.startWorldX, world.x)
      const rectY = Math.min(box.startWorldY, world.y)
      const rectW = Math.abs(world.x - box.startWorldX)
      const rectH = Math.abs(world.y - box.startWorldY)
      const next = new Set<string>(box.additive ? box.initialSelectedNodeIds : [])
      editor.nodesRef.current.forEach((node) => {
        if (rectX < node.position.x + node.width && rectX + rectW > node.position.x && rectY < node.position.y + node.height && rectY + rectH > node.position.y) {
          next.add(node.id)
        }
      })
      editor.setSelectionBox({ ...box, currentWorldX: world.x, currentWorldY: world.y })
      editor.setSelectedNodeIds(next)
    }
    const onUp = (event: MouseEvent) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (dragRef.current.isDraggingNode) {
        const wasClick = !dragRef.current.hasMoved && dragRef.current.initialSelectedNodes.length === 1
        const clickedNodeId = dragRef.current.initialSelectedNodes[0]?.id
        if (dragRef.current.hasMoved) {
          editor.snapshot()
        }
        dragRef.current.isDraggingNode = false
        dragRef.current.hasMoved = false
        dragRef.current.initialSelectedNodes = []

        if (wasClick && clickedNodeId) {
          editor.setSelectedNodeIds(new Set([clickedNodeId]))
          const clickedNode = editor.nodesRef.current.find((node) => node.id === clickedNodeId)
          if (clickedNode && clickedNode.type !== CanvasNodeType.Group) {
            editor.setDialogNodeId(clickedNodeId)
          }
        }
      }
      editor.setSelectionBox(null)
      const conn = connectingRef.current
      if (conn) {
        const target = hitNode(editor.nodesRef.current, worldOf(event.clientX, event.clientY), conn.nodeId)
        if (target) editor.connectNodes(conn, target.id)
        else editor.setPendingConnectionCreate({ connection: conn, position: worldOf(event.clientX, event.clientY) })
        editor.setConnectingParams(null)
        editor.setConnectionTargetNodeId(null)
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("pointermove", onPointerMove)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [editor, worldOf])

  return { handleCanvasMouseDown, handleNodeMouseDown, handleNodeSelectCapture, handleConnectStart }
}

function hitNode(nodes: CanvasNodeData[], world: Position, excludeId: string) {
  const padded = nodes.find((node) => {
    if (node.id === excludeId) return false
    return (
      world.x >= node.position.x - CONNECTION_NODE_HIT_PADDING &&
      world.x <= node.position.x + node.width + CONNECTION_NODE_HIT_PADDING &&
      world.y >= node.position.y - CONNECTION_HANDLE_HIT_RADIUS &&
      world.y <= node.position.y + node.height + CONNECTION_HANDLE_HIT_RADIUS
    )
  })
  return padded
}
