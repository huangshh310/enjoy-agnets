/**
 * 创建画布节点，对齐 infinite-canvas createCanvasNode。
 */
import { NODE_SPECS } from "./canvas-constants"
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeMetadata, type CanvasNodeTypeId, type Position } from "./canvas.types"

export function createCanvasNode(
  type: CanvasNodeTypeId,
  position: Position,
  metadata?: CanvasNodeMetadata,
  title?: string
): CanvasNodeData {
  const spec = NODE_SPECS[type as CanvasNodeType] ?? NODE_SPECS[CanvasNodeType.Text]
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: title ?? defaultTitle(type),
    position: {
      x: position.x - spec.width / 2,
      y: position.y - spec.height / 2
    },
    width: spec.width,
    height: spec.height,
    metadata: { ...spec.metadata, ...metadata }
  }
}

function defaultTitle(type: CanvasNodeTypeId): string {
  if (type === CanvasNodeType.Image) return "Image"
  if (type === CanvasNodeType.Text) return "Text"
  if (type === CanvasNodeType.Config) return "Generate"
  if (type === CanvasNodeType.Video) return "Video"
  if (type === CanvasNodeType.Audio) return "Audio"
  if (type === CanvasNodeType.Group) return "Group"
  return "Node"
}

export function fitNodeSize(width: number, height: number, maxW = 420, maxH = 420) {
  const ratio = width / Math.max(height, 1)
  if (width <= maxW && height <= maxH) return { width, height }
  if (ratio >= maxW / maxH) return { width: maxW, height: Math.round(maxW / ratio) }
  return { width: Math.round(maxH * ratio), height: maxH }
}
