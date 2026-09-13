/**
 * 扩展发现壳视图类型。安装内核仍在 MCP / Skills 工作模块。
 */

export type ExtensionsColumnId = "mcp" | "skills"

export type ExtensionCuratedCard = {
  id: string
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
