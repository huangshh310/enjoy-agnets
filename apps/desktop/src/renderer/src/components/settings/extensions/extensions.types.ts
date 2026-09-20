/**
 * 扩展发现壳视图模型：H 两列已配置 + I2 精选写入载荷。
 */

export type ExtensionsColumnId = "mcp" | "skills"
export type ExtensionKind = "mcp" | "skills"

/** 精选卡：只读展示 + 写入现有 SoT 所需字段，不含第二套 CRUD。 */
export type ExtensionCuratedCard = {
  id: string
  kind: ExtensionKind
  title: string
  description: string
  transport?: "stdio" | "sse" | "http"
  command?: string
  url?: string
  locator?: string
  sourceName?: string
}

export type ExtensionsColumnModel = {
  id: ExtensionsColumnId
  title: string
  countLabel: string
  addHref: string
  addLabel: string
  configured: string[]
}
