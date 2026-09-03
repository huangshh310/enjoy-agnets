/** Inbox / notification center. */
export const enInboxPages = {
  searchPlaceholder: "Search messages and notices…",
  navGroup: "Messages",
  navAll: "All messages",
  navUnread: "Unread",
  navAgent: "Agent runs",
  navSystem: "System & security",
  title: "Inbox",
  breadcrumb: "Inbox > {section}",
  unreadCount: "{n} unread",
  allCaughtUp: "All caught up",
  markAllRead: "Mark all read",
  clearRead: "Clear read",
  empty: "No messages match this filter",
  emptyHint: "Try another category, or clear the search.",
  groupToday: "Today",
  groupYesterday: "Yesterday",
  groupEarlier: "Earlier",
  justNow: "Just now",
  minutesAgo: "{n} min ago",
  hoursAgo: "{n} hr ago",
  daysAgo: "{n}d ago",
  categoryAgent: "Run",
  categorySystem: "System",
  markRead: "Mark read",
  markUnread: "Mark unread",
  readerEmpty: "Select a message",
  readerEmptyHint: "Open a run notice or system alert from the timeline.",
  actions: {
    openSession: "Open session",
    openSandbox: "Security",
    openKnowledge: "Knowledge",
    openProviders: "Models",
    openTeam: "Team"
  },
  seed: {
    rustRefactorTitle: "Rust login module refactor finished",
    rustRefactorSummary:
      "ToolLoopAgent wrote the code and tests: 10 source files (+559 / -0).",
    shellApprovedTitle: "Shell command auto-approved",
    shellApprovedSummary:
      "Allowed: curl -fsSL https://wttr.in/Shanghai?format=3, exit 0.",
    hmacBoundTitle: "Session HMAC bound to the main process",
    hmacBoundSummary:
      "Approval credentials are now HMAC-bound to Electron main, blocking renderer privilege escalation.",
    knowledgeIndexedTitle: "Knowledge index increment complete",
    knowledgeIndexedSummary:
      "128 Markdown and code documents indexed. RAG retrieval is ready.",
    contextCompactedTitle: "Session context compacted",
    contextCompactedSummary:
      "The long thread neared 20 turns; compaction saved 74% redundant reasoning tokens.",
    engineReadyTitle: "Enjoy Agents desktop engine ready",
    engineReadySummary:
      "Running v0.1.0 (Electron 39 + Node 22 + React 19). Capability matrix is on.",
    providerHealthyTitle: "Model providers reachable",
    providerHealthySummary:
      "DeepSeek and Grok custom endpoints are up. Average latency 82ms, streaming is healthy.",
    teamWelcomeTitle: "Welcome to the Enjoy Agents core team",
    teamWelcomeSummary:
      "team@enjoy-agents.dev is on Team Pro. Multi-agent collaboration is unlocked."
  }
}
