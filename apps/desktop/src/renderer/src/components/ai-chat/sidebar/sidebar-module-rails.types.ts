/**
 * 侧栏模块轨道条目。
 */
import { RiChat1Line } from "@remixicon/react"

export type RailItem = {
  id: string
  labelKey: string
  icon: typeof RiChat1Line
  to: string
  matchPrefix?: string
}
