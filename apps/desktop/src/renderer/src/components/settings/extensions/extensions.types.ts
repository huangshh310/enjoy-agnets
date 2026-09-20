/**
 * 扩展发现壳视图模型：两列 MCP | Skills，精选只读投影。
 */

export type ExtensionsColumnId = "mcp" | "skills"
export type ExtensionKind = "mcp" | "skills"

export type ExtensionCuratedCard = {
  id: string
  kind: ExtensionKind
  title: string
  description: string
  href: string
}

export type ExtensionsColumnModel = {
  id: ExtensionsColumnId
  title: string
  countLabel: string
  addHref: string
  addLabel: string
  cards: ExtensionCuratedCard[]
}
