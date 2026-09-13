/**
 * 消费 #/mcp?tab=&preset=：切市场并预填现有创建表单，不另开内核。
 */
import { useEffect, useRef } from "react"
import { useSearch } from "@tanstack/react-router"
import type { TranslateFn } from "@renderer/i18n"
import { getFeaturedMcpPresets } from "../constants/mcp-presets"
import { parseMcpSearch } from "../lib/mcp-route-search"
import type { McpActiveTab, McpPluginPreset } from "../types/mcp-ui.types"

export function useMcpRouteSearch(input: {
  t: TranslateFn
  setActiveTab: (tab: McpActiveTab) => void
  onPrefill: (preset: McpPluginPreset) => void
}) {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const parsed = parseMcpSearch(search)
  const applied = useRef<string | null>(null)
  const { t, setActiveTab, onPrefill } = input

  useEffect(() => {
    if (parsed.tab) setActiveTab(parsed.tab)
  }, [parsed.tab, setActiveTab])

  useEffect(() => {
    if (!parsed.preset || applied.current === parsed.preset) return
    const preset = getFeaturedMcpPresets(t).find((item) => item.id === parsed.preset)
    if (!preset) return
    applied.current = parsed.preset
    setActiveTab("marketplace")
    onPrefill(preset)
  }, [onPrefill, parsed.preset, setActiveTab, t])
}
