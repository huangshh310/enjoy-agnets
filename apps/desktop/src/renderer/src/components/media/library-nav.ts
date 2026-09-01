/**
 * 资产库侧栏：分类计数 → SecondaryPageShell groups。
 */
import { RiFileLine, RiFileMusicLine, RiFileVideoLine, RiImageLine } from "@remixicon/react"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { countLibraryAssets } from "./media-filters"
import { LIBRARY_NAV_ITEMS, type AssetCategory } from "./media-page.types"

const NAV_ICONS: Record<AssetCategory, typeof RiImageLine> = {
  all: RiImageLine,
  image: RiImageLine,
  audio: RiFileMusicLine,
  video: RiFileVideoLine,
  file: RiFileLine
}

export function buildLibraryNav(assets: AssetRecord[]) {
  const counts = countLibraryAssets(assets)
  return [
    {
      id: "library",
      label: "Asset Studio",
      items: LIBRARY_NAV_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        icon: NAV_ICONS[item.id],
        meta: String(counts[item.id])
      }))
    }
  ]
}
