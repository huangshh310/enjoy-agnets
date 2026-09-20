/**
 * 精选 catalog 查询：失败保持 error，供空态 + 重试。
 */
import { useQuery } from "@tanstack/react-query"
import { useT } from "@renderer/i18n"
import { createDefaultCatalogLoader } from "./default-catalog-loader.ts"
import { loadCuratedCatalog } from "./load-curated-catalog.ts"

export const CURATED_CATALOG_QUERY_KEY = ["extensions-curated-catalog"] as const

export function useCuratedCatalog() {
  const t = useT()
  return useQuery({
    queryKey: CURATED_CATALOG_QUERY_KEY,
    queryFn: () => loadCuratedCatalog(createDefaultCatalogLoader(t))
  })
}
