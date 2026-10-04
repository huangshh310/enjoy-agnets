/**
 * 审查差异配色。记在 localStorage，默认 default。
 */
import { useCallback, useState } from "react"
import {
  DIFF_PALETTE_STORAGE_KEY,
  parseDiffPalette,
  type DiffPalette
} from "../../../../diff/diff-palette"

function readStoredPalette(): DiffPalette {
  try {
    return parseDiffPalette(window.localStorage.getItem(DIFF_PALETTE_STORAGE_KEY))
  } catch {
    return "default"
  }
}

export function useDiffPalette() {
  const [palette, setPaletteState] = useState<DiffPalette>(readStoredPalette)
  const setPalette = useCallback((next: DiffPalette) => {
    setPaletteState(next)
    try {
      window.localStorage.setItem(DIFF_PALETTE_STORAGE_KEY, next)
    } catch {
      /* 隐私模式写不进时只留这次内存值 */
    }
  }, [])
  return { palette, setPalette }
}
