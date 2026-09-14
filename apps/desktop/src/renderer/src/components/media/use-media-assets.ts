/**
 * 资产列表、分类、选中项。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { filterLibraryAssets, isAudioLibraryAsset } from "./media-filters"
import { buildLibraryNav } from "./library-nav"
import type { AssetCategory } from "./media-page.types"

export function useMediaAssets() {
  const t = useT()
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("all")
  const [filterQuery, setFilterQuery] = useState("")
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const assetsQuery = useQuery({
    queryKey: ["assets"],
    enabled: hasIde(),
    queryFn: () => getIde().assets.list() as Promise<AssetRecord[]>
  })
  const assets = assetsQuery.data ?? []
  const visibleAssets = useMemo(
    () => filterLibraryAssets(assets, selectedCategory, filterQuery),
    [assets, selectedCategory, filterQuery]
  )
  const selectedAsset = useMemo(
    () => assets.find((row) => row.id === selectedAssetId),
    [assets, selectedAssetId]
  )
  const selectedAudioAsset =
    selectedAsset && isAudioLibraryAsset(selectedAsset) ? selectedAsset : undefined
  const pendingDeleteAsset = assets.find((row) => row.id === pendingDeleteId)
  const groups = useMemo(() => buildLibraryNav(assets, t), [assets, t])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["assets"] })
  }

  return {
    assets,
    visibleAssets,
    groups,
    selectedCategory,
    setSelectedCategory,
    filterQuery,
    setFilterQuery,
    selectedAssetId,
    setSelectedAssetId,
    selectedAsset,
    selectedAudioAsset,
    pendingDeleteId,
    setPendingDeleteId,
    pendingDeleteAsset,
    isLoading: assetsQuery.isLoading,
    refresh
  }
}
