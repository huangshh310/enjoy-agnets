/**
 * 节点默认尺寸，对齐 infinite-canvas NODE_DEFAULT_SIZE。
 */
import { CanvasNodeType } from "./canvas.types"

export const NODE_DEFAULT_SIZE = {
  [CanvasNodeType.Image]: { width: 340, height: 240 },
  [CanvasNodeType.Text]: { width: 340, height: 240 },
  [CanvasNodeType.Config]: { width: 340, height: 240 },
  [CanvasNodeType.Video]: { width: 420, height: 236 },
  [CanvasNodeType.Audio]: { width: 340, height: 120 },
  [CanvasNodeType.Group]: { width: 760, height: 480 }
} as const

export const NODE_SPECS = {
  [CanvasNodeType.Image]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Image], metadata: { content: "", status: "idle" as const } },
  [CanvasNodeType.Text]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Text], metadata: { content: "", status: "idle" as const, fontSize: 14 } },
  [CanvasNodeType.Config]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Config], metadata: { content: "", status: "idle" as const, generationMode: "image" as const } },
  [CanvasNodeType.Video]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Video], metadata: { content: "", status: "idle" as const } },
  [CanvasNodeType.Audio]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Audio], metadata: { content: "", status: "idle" as const } },
  [CanvasNodeType.Group]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Group], metadata: { status: "idle" as const } }
}

export const SELECTION_BLUE = "#2f80ff"
export const CONNECTION_HANDLE_HIT_RADIUS = 40
export const CONNECTION_NODE_HIT_PADDING = 32
export const VIDEO_NODE_MAX_WIDTH = 420
export const VIDEO_NODE_MAX_HEIGHT = 420
export const HISTORY_LIMIT = 40
export const STORE_KEY = "enjoy-agents:workflow-canvas-v1"
