/**
 * 精选 catalog 纯加载：失败必须抛出，调用方画诚实空态。
 */
import type { CuratedCatalog, CuratedCatalogLoader } from "./curated.types.ts"

export async function loadCuratedCatalog(loader: CuratedCatalogLoader): Promise<CuratedCatalog> {
  const [mcp, skills] = await Promise.all([loader.loadMcp(), loader.loadSkills()])
  return { mcp, skills }
}
