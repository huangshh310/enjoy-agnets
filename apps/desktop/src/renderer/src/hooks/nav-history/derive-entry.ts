/**
 * 把路由和当前会话收成一页历史。
 * 同一 id 再点只更新标题和参数，不在这里入栈。
 */
import { DEFAULT_HISTORY_ID } from "./constants.ts"
import { historySessionId, historyWorkspaceId } from "./page-ids.ts"
import type { HistoryEntry, HistoryParams } from "./nav-history.types.ts"

export type PageSnapshot = {
  pathname: string
  search: Record<string, unknown>
  sessionId: string | null
  sessionTitle: string
  workspaceId: string | null
  workspaceName: string
}

export type DerivedHistory = {
  id: string
  titleKey?: string
  literalTitle?: string
  params: HistoryParams
}

const SETTINGS_TITLE_KEYS: Record<string, string> = {
  general: "nav.general",
  appearance: "nav.appearance",
  shortcuts: "nav.shortcuts",
  providers: "nav.providers",
  agent: "nav.agent",
  tools: "nav.tools",
  "computer-use": "nav.computerUse",
  appsnap: "nav.appsnap",
  instructions: "nav.instructions",
  skills: "nav.skills",
  rules: "nav.rules",
  capabilities: "nav.capabilities",
  workflow: "nav.workflow",
  sandbox: "nav.sandbox",
  workspace: "nav.workspace",
  extensions: "nav.extensions",
  knowledge: "nav.knowledge",
  media: "nav.media",
  mcp: "nav.mcp",
  automations: "nav.automations",
  telemetry: "nav.telemetry",
  git: "nav.git",
  team: "nav.team",
  members: "nav.members",
  billing: "nav.billing",
  organization: "nav.organization",
  integrations: "nav.companyIntegrations",
  account: "nav.account",
  notifications: "nav.notifications",
  archived: "nav.archived"
}

const ROUTE_TITLE_KEYS: Record<string, string> = {
  "/inbox": "nav.inbox",
  "/knowledge": "nav.knowledge",
  "/workflows": "nav.workflows",
  "/media": "nav.media",
  "/mcp": "nav.mcp",
  "/skills": "nav.skills",
  "/kanban": "chat.kanbanTitle",
  "/automations": "nav.automations"
}

export function deriveHistoryEntry(snapshot: PageSnapshot): DerivedHistory {
  const settings = deriveSettings(snapshot)
  if (settings) return settings
  const routed = deriveModule(snapshot)
  if (routed) return routed
  if (isChatHome(snapshot.pathname)) return deriveChatHome(snapshot)
  return {
    id: `route:${snapshot.pathname}`,
    literalTitle: snapshot.pathname,
    params: { kind: "route", to: snapshot.pathname }
  }
}

export function materializeEntry(derived: DerivedHistory, titleFor: (key: string) => string): HistoryEntry {
  const translated = derived.titleKey ? titleFor(derived.titleKey) : ""
  const title = derived.literalTitle?.trim() || translated || derived.id
  return { id: derived.id, title, params: derived.params }
}

export function historyPathname(entry: HistoryEntry): string {
  const params = entry.params
  if (!params || params.kind === "session" || params.kind === "workspace") return "/"
  if (params.to === "/settings/$section") return `/settings/${params.params?.section ?? "general"}`
  return params.to || "/"
}

function deriveSettings(snapshot: PageSnapshot): DerivedHistory | null {
  const section = settingsSection(snapshot.pathname)
  if (!section) return null
  const tab = text(snapshot.search, "tab")
  const id = tab ? `settings:${section}:${tab}` : `settings:${section}`
  const search = tab ? { tab } : undefined
  return {
    id,
    titleKey: SETTINGS_TITLE_KEYS[section] ?? "common.settings",
    params: {
      kind: "route",
      to: "/settings/$section",
      params: { section },
      search
    }
  }
}

function deriveModule(snapshot: PageSnapshot): DerivedHistory | null {
  const { pathname } = snapshot
  if (pathname === "/knowledge") return deriveKnowledge(snapshot)
  if (pathname === "/skills") return deriveTabbed("/skills", "skills", "nav.skills", snapshot)
  if (pathname === "/mcp") return deriveTabbed("/mcp", "mcp", "nav.mcp", snapshot)
  const titleKey = ROUTE_TITLE_KEYS[pathname]
  if (!titleKey) return null
  return routeEntry(`route:${pathname}`, titleKey, { kind: "route", to: pathname })
}

function deriveKnowledge(snapshot: PageSnapshot): DerivedHistory {
  const path = text(snapshot.search, "path")
  if (!path) return routeEntry("route:/knowledge", "nav.knowledge", { kind: "route", to: "/knowledge" })
  return {
    id: `knowledge:${path}`,
    literalTitle: baseName(path),
    params: { kind: "route", to: "/knowledge", search: { path } }
  }
}

function deriveTabbed(pathname: string, prefix: string, titleKey: string, snapshot: PageSnapshot): DerivedHistory {
  const tab = text(snapshot.search, "tab")
  const id = tab ? `${prefix}:${tab}` : `route:${pathname}`
  return routeEntry(id, titleKey, {
    kind: "route",
    to: pathname,
    search: tab ? { tab } : undefined
  })
}

function deriveChatHome(snapshot: PageSnapshot): DerivedHistory {
  if (snapshot.sessionId) {
    return {
      id: historySessionId(snapshot.sessionId),
      literalTitle: snapshot.sessionTitle.trim() || undefined,
      titleKey: "studio.newChat",
      params: {
        kind: "session",
        to: "/",
        sessionId: snapshot.sessionId,
        workspaceId: snapshot.workspaceId ?? undefined
      }
    }
  }
  if (snapshot.workspaceId) {
    return {
      id: historyWorkspaceId(snapshot.workspaceId),
      literalTitle: snapshot.workspaceName.trim() || undefined,
      titleKey: "studio.hero.unnamedWorkspace",
      params: { kind: "workspace", to: "/", workspaceId: snapshot.workspaceId }
    }
  }
  return routeEntry(DEFAULT_HISTORY_ID, "studio.newChat", { kind: "route", to: "/" })
}

function routeEntry(id: string, titleKey: string, params: HistoryParams): DerivedHistory {
  return { id, titleKey, params }
}

function isChatHome(pathname: string): boolean {
  return pathname === "/" || pathname === ""
}

function settingsSection(pathname: string): string | null {
  if (pathname === "/settings" || pathname === "/settings/") return "general"
  if (!pathname.startsWith("/settings/")) return null
  return pathname.slice("/settings/".length).split("/")[0] || "general"
}

function text(search: Record<string, unknown>, key: string): string | undefined {
  const value = search[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) || path
}
