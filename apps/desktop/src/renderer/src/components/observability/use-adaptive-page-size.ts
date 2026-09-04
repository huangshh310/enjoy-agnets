/**
 * 视口高度自适应表格页大小。用户手改后不再被 resize 覆盖。
 */
import { useEffect, useState } from "react"
import { getAdaptivePageSize } from "./types/observability-ui.types"

export function useAdaptivePageSize() {
  const [pageSize, setPageSize] = useState(() => getAdaptivePageSize())
  const [userOverride, setUserOverride] = useState(false)

  useEffect(() => {
    function onResize() {
      if (userOverride) return
      setPageSize(getAdaptivePageSize())
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [userOverride])

  function handlePageSizeChange(next: number) {
    setUserOverride(true)
    setPageSize(next)
  }

  return { pageSize, setPageSize: handlePageSizeChange }
}
