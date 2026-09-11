/**
 * 日 / 模型 / 项目一张表，分段切换，不再叠三张同构表。
 */
import { useState } from "react"
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useT } from "@renderer/i18n"
import { CLI_USAGE_BUCKET_TABS, type CliUsageBucketTab } from "../../lib/constants"
import { CliUsageBucketTable } from "./bucket-table"

const TAB_COPY: Record<CliUsageBucketTab, { title: string; key: string }> = {
  days: { title: "cliUsageDays", key: "cliUsageDayCol" },
  models: { title: "cliUsageModels", key: "cliUsageModelCol" },
  projects: { title: "cliUsageProjects", key: "cliUsageProjectCol" }
}

export function CliUsageBucketSection(props: {
  days: CliUsageBucket[]
  models: CliUsageBucket[]
  projects: CliUsageBucket[]
  filtered: boolean
}) {
  const t = useT()
  const [tab, setTab] = useState<CliUsageBucketTab>("days")
  const rows = props[tab]
  return (
    <section className="overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as CliUsageBucketTab)}
        className="gap-0"
      >
        <TabsList className="mx-3.5 my-2 h-7 gap-0.5 rounded-lg bg-background-tertiary-default p-0.5">
          {CLI_USAGE_BUCKET_TABS.map((id) => (
            <TabsTrigger
              key={id}
              value={id}
              className="h-6 rounded-md px-2.5 text-caption-2-medium text-text-secondary data-[state=active]:bg-background-primary-default data-[state=active]:text-text-primary data-[state=active]:shadow-xs"
            >
              {t(`pages.observability.${TAB_COPY[id].title}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-0 border-t border-separator-border/60">
          <CliUsageBucketTable
            keyLabel={t(`pages.observability.${TAB_COPY[tab].key}`)}
            rows={rows}
            filtered={props.filtered}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
