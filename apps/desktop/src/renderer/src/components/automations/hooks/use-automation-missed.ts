/**
 * 每条自动化的本机错过记录。随 automations.changed（含 missed）一起失效。
 */
import { useQuery } from "@tanstack/react-query"
import type { AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export const AUTOMATION_MISSED_QUERY_KEY = ["automations", "missed"] as const

export function useAutomationMissed(ids: string[]) {
  const key = [...ids].sort().join(",")
  return useQuery({
    queryKey: [...AUTOMATION_MISSED_QUERY_KEY, key],
    enabled: hasIde() && ids.length > 0,
    queryFn: async () => {
      const pairs = await Promise.all(
        ids.map(async (id) => {
          const result = (await getIde().automations.listMissed({ id })) as {
            records: AutomationMissedRecord[]
          }
          return [id, result.records] as const
        })
      )
      return Object.fromEntries(pairs) as Record<string, AutomationMissedRecord[]>
    }
  })
}
