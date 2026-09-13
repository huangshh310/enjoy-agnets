/**
 * 消费 #/skills?tab=&install=：打开精选集市并定位套件。
 */
import { useEffect } from "react"
import { useSearch } from "@tanstack/react-router"
import { parseSkillsSearch } from "../lib/skills-route-search"

export function useSkillsRouteSearch(setSelectedNavId: (id: string) => void) {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const parsed = parseSkillsSearch(search)

  useEffect(() => {
    if (parsed.tab === "packs") {
      setSelectedNavId("packs")
      return
    }
    if (parsed.tab === "curated" || parsed.install) setSelectedNavId("curated")
  }, [parsed.install, parsed.tab, setSelectedNavId])
}
