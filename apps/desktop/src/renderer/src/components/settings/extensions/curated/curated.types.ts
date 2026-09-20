/**
 * I2 精选 catalog 与写入 SoT 的窄类型。不新开存储。
 */
import type { ExtensionCuratedCard } from "../extensions.types.ts"

export type CuratedCatalog = {
  mcp: ExtensionCuratedCard[]
  skills: ExtensionCuratedCard[]
}

export type CuratedCatalogLoader = {
  loadMcp: () => Promise<ExtensionCuratedCard[]>
  loadSkills: () => Promise<ExtensionCuratedCard[]>
}

/** 只暴露现有 mcp.upsert / skills.sources.add+deploy，禁止第二套 CRUD。 */
export type CuratedSotIde = {
  mcp: {
    servers: () => Promise<Array<{ id: string; name: string }>>
    upsert: (input: Record<string, unknown>) => Promise<unknown>
  }
  skills: {
    sources: {
      add: (input: { kind: "git"; origin: string; name?: string }) => Promise<{ id?: string }>
      deploy: (input: { sourceId: string }) => Promise<unknown>
    }
  }
}
