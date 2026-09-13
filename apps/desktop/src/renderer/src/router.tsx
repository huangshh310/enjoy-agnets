import { useEffect } from "react"
import {
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate
} from "@tanstack/react-router"
import { AppShell } from "@renderer/components/app-shell/app-shell"
import { SettingsSectionPage } from "@renderer/components/settings/settings-section"
import { SettingsShell } from "@renderer/components/settings/settings-shell"
import { isSettingsSectionId } from "@renderer/components/settings/settings-catalog"
import { isCustomizeSectionId } from "@renderer/components/customize/customize-page"
import { KnowledgePage } from "@renderer/components/knowledge/knowledge-page"
import { parseKnowledgeSearch } from "@renderer/components/knowledge/lib/knowledge-route-search"
import { WorkflowsPage } from "@renderer/components/workflows/workflows-page"
import { MediaPage } from "@renderer/components/media/media-page"
import { McpPage } from "@renderer/components/mcp/mcp-page"
import { parseMcpSearch } from "@renderer/components/mcp/lib/mcp-route-search"
import { SkillsPage } from "@renderer/components/skills/skills-page"
import { parseSkillsSearch } from "@renderer/components/skills/lib/skills-route-search"
import { ObservabilityPage } from "@renderer/components/observability/observability-page"
import { QuickSearchDialog } from "@renderer/components/search/quick-search-dialog"
import { WindowFrame } from "@renderer/components/layout/window-frame"
import { useAgentSession } from "@renderer/hooks/use-agent-session"
import { startAttentionPersistence } from "@renderer/stores/attention/persist-attention"
import { InboxPage } from "@renderer/components/inbox/inbox-page"
import {
  RedirectPlaceholder,
  mappedSettingsBeforeLoad,
  settingsBeforeLoad
} from "@renderer/components/app-shell/routing/redirect-settings"
import { parseSettingsSectionSearch } from "@renderer/components/settings/settings-section-search"

function RootLayout() {
  useAgentSession()
  useEffect(() => startAttentionPersistence(), [])
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key === ",") {
        event.preventDefault()
        void navigate({ to: "/settings/$section", params: { section: "general" } })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate])

  return (
    <WindowFrame>
      <Outlet />
      <QuickSearchDialog />
    </WindowFrame>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout
})

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-shell",
  component: AppShell
})

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/",
  component: function ChatIndex() {
    return null
  }
})

const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/settings",
  component: SettingsShell
})

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/settings/$section", params: { section: "general" } })
  }
})

const settingsSectionRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "$section",
  validateSearch: (search: Record<string, unknown>) => parseSettingsSectionSearch(search),
  beforeLoad: ({ params }) => {
    if (!isSettingsSectionId(params.section)) {
      throw redirect({ to: "/settings/$section", params: { section: "general" } })
    }
    if (params.section === "skills") {
      throw redirect({ to: "/skills" })
    }
  },
  component: SettingsSectionPage
})

const knowledgeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/knowledge",
  validateSearch: (search: Record<string, unknown>) => parseKnowledgeSearch(search),
  component: KnowledgePage
})

const workflowsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/workflows",
  component: WorkflowsPage
})

const mediaRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/media",
  component: MediaPage
})

const mcpRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/mcp",
  validateSearch: (search: Record<string, unknown>) => parseMcpSearch(search),
  component: McpPage
})

const skillsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/skills",
  validateSearch: (search: Record<string, unknown>) => parseSkillsSearch(search),
  component: SkillsPage
})

const observabilityRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/observability",
  component: ObservabilityPage
})

const inboxRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inbox",
  component: InboxPage
})

const studioRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/studio",
  beforeLoad: () => {
    throw redirect({ to: "/" })
  },
  component: RedirectPlaceholder
})

const automationsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/automations",
  beforeLoad: settingsBeforeLoad("automations"),
  component: RedirectPlaceholder
})

const customizeIndexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/customize",
  beforeLoad: settingsBeforeLoad("instructions"),
  component: RedirectPlaceholder
})

const customizeSectionRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/customize/$section",
  beforeLoad: ({ params }) => {
    if (params.section === "skills") {
      throw redirect({ to: "/skills" })
    }
    throw redirect({
      to: "/settings/$section",
      params: { section: isCustomizeSectionId(params.section) ? params.section : "instructions" }
    })
  },
  component: RedirectPlaceholder
})

const teamIndexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/team",
  beforeLoad: settingsBeforeLoad("team"),
  component: RedirectPlaceholder
})

const teamSectionRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/team/$section",
  beforeLoad: mappedSettingsBeforeLoad((section) => (section === "members" ? "members" : "team")),
  component: RedirectPlaceholder
})

const workspacesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/workspaces",
  beforeLoad: settingsBeforeLoad("workspace"),
  component: RedirectPlaceholder
})

const companyIndexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/company",
  beforeLoad: settingsBeforeLoad("billing"),
  component: RedirectPlaceholder
})

const companySectionRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/company/$section",
  beforeLoad: mappedSettingsBeforeLoad((section) => {
    if (section === "details") return "organization"
    if (section === "integrations") return "integrations"
    return "billing"
  }),
  component: RedirectPlaceholder
})

const accountIndexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/account",
  beforeLoad: settingsBeforeLoad("account"),
  component: RedirectPlaceholder
})

const accountSectionRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/account/$section",
  beforeLoad: mappedSettingsBeforeLoad((section) =>
    section === "notifications" ? "notifications" : "account"
  ),
  component: RedirectPlaceholder
})

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    indexRoute,
    settingsRoute.addChildren([settingsIndexRoute, settingsSectionRoute]),
    knowledgeRoute,
    workflowsRoute,
    mediaRoute,
    mcpRoute,
    skillsRoute,
    observabilityRoute,
    inboxRoute,
    studioRoute,
    automationsRoute,
    customizeIndexRoute,
    customizeSectionRoute,
    teamIndexRoute,
    teamSectionRoute,
    workspacesRoute,
    companyIndexRoute,
    companySectionRoute,
    accountIndexRoute,
    accountSectionRoute
  ])
])

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: "intent"
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
