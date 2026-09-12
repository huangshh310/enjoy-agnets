/**
 * 完成条「在浏览器打开」的可开目标。
 */
export type PreviewTarget =
  | { kind: "html"; path: string }
  | { kind: "url"; url: string }

export type PickPreviewTargetInput = {
  selectedPath?: string | null
  files?: Array<{ path: string }>
  sessionUrl?: string | null
}
