/**
 * 无限画布编辑器：对齐 infinite-canvas project.tsx 的视口、框选、拖拽、连线与工具坞。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActiveConnectionPath, ConnectionPath } from "./canvas-connections"
import { CanvasContextMenu } from "./canvas-context-menu"
import { ConnectionCreateMenu, NodeCreateMenu } from "./canvas-create-menus"
import { InfiniteCanvas } from "./infinite-canvas"
import { CanvasMinimap } from "./canvas-mini-map"
import { CanvasPromptPanel } from "./canvas-prompt-panel"
import { CanvasToolbar } from "./canvas-toolbar"
import { CanvasZoomControls } from "./canvas-zoom-controls"
import { CanvasNode } from "./nodes/canvas-node"
import { importCanvasFiles } from "../lib/import-canvas-files"
import { CanvasNodeType } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"
import { useCanvasEditor, screenToWorld } from "../hooks/use-canvas-editor"
import { useCanvasGeneration } from "../hooks/use-canvas-generation"
import { useCanvasKeyboard } from "../hooks/use-canvas-keyboard"
import { useCanvasPointer } from "../hooks/use-canvas-pointer"

export function CanvasEditor({ projectId }: { projectId: string }) {
  const theme = useCanvasTheme()
  const editor = useCanvasEditor(projectId)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [size, setSize] = useState({ width: 1200, height: 720 })
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false)
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null)
  const generation = useCanvasGeneration(editor.setNodes)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const worldOf = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return screenToWorld(editor.viewport, clientX, clientY, rect)
    },
    [editor.viewport]
  )

  const pointer = useCanvasPointer({ editor, worldOf })
  useCanvasKeyboard({ editor })

  const nodeById = useMemo(() => new Map(editor.nodes.map((node) => [node.id, node])), [editor.nodes])
  const related = useMemo(() => relatedIds(editor.selectedNodeIds, editor.connections), [editor.connections, editor.selectedNodeIds])

  async function importFiles(files: File[], position?: { x: number; y: number }) {
    const created = await importCanvasFiles(files, position ?? worldOf(size.width / 2, size.height / 2))
    if (!created.length) return
    editor.snapshot()
    editor.setNodes((prev) => [...prev, ...created])
  }

  return (
    <div className="relative size-full min-h-0" data-testid="page-workflows">
      <InfiniteCanvas
        containerRef={containerRef}
        viewport={editor.viewport}
        tool={editor.canvasTool}
        backgroundMode={editor.backgroundMode}
        onViewportChange={editor.setViewport}
        onCanvasMouseDown={pointer.handleCanvasMouseDown}
        onCanvasDeselect={() => {
          editor.setSelectedNodeIds(new Set())
          editor.setSelectedConnectionId(null)
          editor.setDialogNodeId(null)
        }}
        onCanvasDoubleClick={(event) => editor.setNodeCreatePosition(worldOf(event.clientX, event.clientY))}
        onDrop={(event) => {
          event.preventDefault()
          void importFiles([...event.dataTransfer.files], worldOf(event.clientX, event.clientY))
        }}
      >
        <svg className="absolute left-0 top-0 h-[10000px] w-[10000px] overflow-visible" style={{ pointerEvents: "none", zIndex: 0 }}>
          {editor.connections.map((connection) => {
            const from = nodeById.get(connection.fromNodeId)
            const to = nodeById.get(connection.toNodeId)
            if (!from || !to) return null
            return (
              <ConnectionPath
                key={connection.id}
                connection={connection}
                from={from}
                to={to}
                active={editor.selectedConnectionId === connection.id || related.has(connection.fromNodeId)}
                onSelect={() => {
                  editor.setSelectedConnectionId(connection.id)
                  editor.setSelectedNodeIds(new Set())
                }}
                onContextMenu={(event) => {
                  editor.setContextMenu({ type: "connection", x: event.clientX, y: event.clientY, connectionId: connection.id })
                }}
              />
            )
          })}
          {editor.connectingParams ? (
            <ActiveConnectionPath
              node={nodeById.get(editor.connectingParams.nodeId)}
              handle={editor.connectingParams}
              mouseWorld={editor.mouseWorld}
              target={editor.connectionTargetNodeId ? nodeById.get(editor.connectionTargetNodeId) : undefined}
            />
          ) : null}
        </svg>

        {editor.nodes.map((node) => (
          <CanvasNode
            key={node.id}
            data={node}
            scale={editor.viewport.k}
            isSelected={editor.selectedNodeIds.has(node.id)}
            isRelated={related.has(node.id)}
            isFocusRelated={editor.hoveredNodeId === node.id}
            isConnectionTarget={editor.connectionTargetNodeId === node.id}
            isConnecting={Boolean(editor.connectingParams)}
            showPanel={editor.dialogNodeId === node.id && !editor.selectionBox}
            onMouseDown={pointer.handleNodeMouseDown}
            onSelectCapture={pointer.handleNodeSelectCapture}
            onHoverStart={(id) => editor.setHoveredNodeId(id)}
            onHoverEnd={() => editor.setHoveredNodeId(null)}
            onConnectStart={pointer.handleConnectStart}
            onResizeStart={() => undefined}
            onResize={(id, width, height, position) =>
              editor.setNodes((prev) => prev.map((item) => (item.id === id ? { ...item, width, height, position: position || item.position } : item)))
            }
            onResizeEnd={() => undefined}
            onContentChange={(id, content) =>
              editor.setNodes((prev) => prev.map((item) => (item.id === id ? { ...item, metadata: { ...item.metadata, content } } : item)))
            }
            onTitleChange={(id, title) => editor.setNodes((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)))}
            onRetry={(item) => void generation.generate(item, item.metadata?.prompt || item.title)}
            onViewImage={() => undefined}
            onContextMenu={(event, nodeId) => {
              event.preventDefault()
              editor.setContextMenu({ type: "node", x: event.clientX, y: event.clientY, nodeId })
            }}
            renderPanel={(item) => (
              <CanvasPromptPanel
                node={item}
                isRunning={runningNodeId === item.id}
                onPromptChange={(id, prompt) =>
                  editor.setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, metadata: { ...n.metadata, prompt } } : n)))
                }
                onConfigChange={(id, patch) =>
                  editor.setNodes((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, metadata: { ...n.metadata, ...patch } } : n))
                  )
                }
                onGenerate={(id, prompt) => {
                  const current = editor.nodes.find((n) => n.id === id)
                  if (!current) return
                  setRunningNodeId(id)
                  void generation.generate(current, prompt).finally(() => setRunningNodeId(null))
                }}
                onStop={(id) => generation.stop(id)}
              />
            )}
          />
        ))}

        {editor.selectionBox ? (
          <svg
            className="pointer-events-none absolute z-[100] overflow-visible"
            style={{
              left: Math.min(editor.selectionBox.startWorldX, editor.selectionBox.currentWorldX),
              top: Math.min(editor.selectionBox.startWorldY, editor.selectionBox.currentWorldY),
              width: Math.abs(editor.selectionBox.currentWorldX - editor.selectionBox.startWorldX),
              height: Math.abs(editor.selectionBox.currentWorldY - editor.selectionBox.startWorldY)
            }}
          >
            <rect width="100%" height="100%" fill={theme.canvas.selectionFill} stroke={theme.canvas.selectionStroke} strokeOpacity={0.55} strokeWidth={1 / editor.viewport.k} strokeDasharray={`${6 / editor.viewport.k} ${4 / editor.viewport.k}`} />
          </svg>
        ) : null}
        {editor.pendingConnectionCreate ? (
          <ConnectionCreateMenu
            pending={editor.pendingConnectionCreate}
            onCreate={(type) => {
              const node = editor.createNode(type, editor.pendingConnectionCreate!.position)
              editor.connectNodes(editor.pendingConnectionCreate!.connection, node.id)
              editor.setPendingConnectionCreate(null)
            }}
            onClose={() => editor.setPendingConnectionCreate(null)}
          />
        ) : null}
        {editor.nodeCreatePosition ? (
          <NodeCreateMenu
            position={editor.nodeCreatePosition}
            onCreate={(type) => editor.createNode(type, editor.nodeCreatePosition!)}
            onClose={() => editor.setNodeCreatePosition(null)}
          />
        ) : null}
      </InfiniteCanvas>

      <CanvasToolbar
        selectedCount={editor.selectedNodeIds.size}
        canvasTool={editor.canvasTool}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        backgroundMode={editor.backgroundMode}
        onAddImage={() => editor.createNode(CanvasNodeType.Image)}
        onAddVideo={() => editor.createNode(CanvasNodeType.Video)}
        onAddAudio={() => editor.createNode(CanvasNodeType.Audio)}
        onAddText={() => editor.createNode(CanvasNodeType.Text)}
        onAddConfig={() => editor.createNode(CanvasNodeType.Config)}
        onAddGroup={() => editor.createNode(CanvasNodeType.Group)}
        onUndo={editor.undoCanvas}
        onRedo={editor.redoCanvas}
        onUpload={() => fileInputRef.current?.click()}
        onDelete={() => editor.deleteNodes(new Set(editor.selectedNodeIds))}
        onClear={() => {
          editor.snapshot()
          editor.setNodes([])
          editor.setConnections([])
        }}
        onCanvasToolChange={editor.setCanvasTool}
        onBackgroundModeChange={editor.setBackgroundMode}
      />
      {isMiniMapOpen ? (
        <CanvasMinimap nodes={editor.nodes} viewport={editor.viewport} viewportSize={size} onViewportChange={editor.setViewport} />
      ) : null}
      <CanvasZoomControls
        scale={editor.viewport.k}
        onScaleChange={(k) => editor.setViewport({ ...editor.viewport, k: Math.min(5, Math.max(0.05, k)) })}
        onReset={() => editor.setViewport({ x: 80, y: 80, k: 1 })}
        isMiniMapOpen={isMiniMapOpen}
        onToggleMiniMap={() => setIsMiniMapOpen((open) => !open)}
      />
      {editor.contextMenu ? (
        <CanvasContextMenu
          menu={editor.contextMenu}
          onClose={() => editor.setContextMenu(null)}
          onDuplicate={() => {
            if (editor.contextMenu?.type === "node") {
              editor.copySelected()
              editor.pasteCopied()
            }
            editor.setContextMenu(null)
          }}
          onDelete={() => {
            if (editor.contextMenu?.type === "node") editor.deleteNodes(new Set([editor.contextMenu.nodeId]))
            else if (editor.contextMenu?.type === "connection") {
              const connectionId = editor.contextMenu.connectionId
              editor.setConnections((prev) => prev.filter((item) => item.id !== connectionId))
            }
            editor.setContextMenu(null)
          }}
        />
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(event) => {
          void importFiles([...(event.target.files ?? [])])
          event.target.value = ""
        }}
      />
    </div>
  )
}

function relatedIds(selected: Set<string>, connections: { fromNodeId: string; toNodeId: string }[]) {
  const set = new Set(selected)
  for (const conn of connections) {
    if (set.has(conn.fromNodeId)) set.add(conn.toNodeId)
    if (set.has(conn.toNodeId)) set.add(conn.fromNodeId)
  }
  return set
}
