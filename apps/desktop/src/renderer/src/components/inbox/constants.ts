/**
 * 收件箱预置通知流。文案走 i18n，这里只放稳定 id、分类与时间偏移。
 */
import type { InboxSeed } from "./inbox.types"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const INBOX_SEEDS: InboxSeed[] = [
  {
    id: "msg_1",
    copyKey: "rustRefactor",
    category: "agent",
    offsetMs: 10 * MINUTE,
    actionKey: "openSession"
  },
  {
    id: "msg_2",
    copyKey: "shellApproved",
    category: "agent",
    offsetMs: 30 * MINUTE
  },
  {
    id: "msg_3",
    copyKey: "hmacBound",
    category: "system",
    offsetMs: 1 * HOUR,
    actionKey: "openSandbox"
  },
  {
    id: "msg_4",
    copyKey: "knowledgeIndexed",
    category: "system",
    offsetMs: 2 * HOUR,
    actionKey: "openKnowledge"
  },
  {
    id: "msg_5",
    copyKey: "contextCompacted",
    category: "agent",
    offsetMs: 3 * HOUR
  },
  {
    id: "msg_6",
    copyKey: "engineReady",
    category: "system",
    offsetMs: 26 * HOUR
  },
  {
    id: "msg_7",
    copyKey: "providerHealthy",
    category: "system",
    offsetMs: 28 * HOUR,
    actionKey: "openProviders"
  },
  {
    id: "msg_8",
    copyKey: "teamWelcome",
    category: "system",
    offsetMs: 2 * DAY,
    actionKey: "openTeam"
  }
]
