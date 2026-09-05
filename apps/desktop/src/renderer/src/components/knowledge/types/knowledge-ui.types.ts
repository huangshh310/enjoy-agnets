/**
 * 知识库重构交互类型。依据 knowledge-ui-rebuild.md §4。
 */
export interface KnowledgeUnavailableSource {
  id?: string
  path: string
  reason: "missing" | "error"
  detail?: string
}

export interface KnowledgeStats {
  askableChunks: number
  scannedFiles: number
  askableFiles: number
  readySourceCount: number
  sourceCount: number
  unavailable: KnowledgeUnavailableSource[]
}

export interface KnowledgeLens {
  id: string
  path: string
  label: string
  chunkCount: number
  ready: boolean
  enabled: boolean
  isDefault: boolean
}

export type KnowledgeDrawerTab = "sources" | "documents"
