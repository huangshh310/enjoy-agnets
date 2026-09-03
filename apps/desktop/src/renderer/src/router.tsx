import { useEffect } from "react"
import {
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState
} from "@tanstack/react-router"
import { AiChatShell } from "@renderer/components/ai-chat/ai-chat-shell"
import { SettingsSectionPage } from "@renderer/components/settings/settings-section"
import { SettingsShell } from "@renderer/components/settings/settings-shell"
import { isSettingsSectionId } from "@renderer/components/settings/settings-catalog"
import { AutomationsPage } from "@renderer/components/automations/automations-page"
import { CustomizePage, isCustomizeSectionId } from "@renderer/components/customize/customize-page"
import { KnowledgePage } from "@renderer/components/knowledge/knowledge-page"
import { WorkflowsPage } from "@renderer/components/workflows/workflows-page"
import { MediaPage } from "@renderer/components/media/media-page"
import { McpPage } from "@renderer/components/mcp/mcp-page"
import { ObservabilityPage } from "@renderer/components/observability/observability-page"
import { AgentStudioPage } from "@renderer/components/studio/agent-studio-page"
import { QuickSearchDialog } from "@renderer/components/search/quick-search-dialog"
import { WindowFrame } from "@renderer/components/layout/window-frame"
import { useAgentSession } from "@renderer/hooks/use-agent-session"
import { TeamPage } from "@renderer/components/team/team-page"
import { WorkspacesPage } from "@renderer/components/workspaces/workspaces-page"
import { InboxPage } from "@renderer/components/inbox/inbox-page"
import { CompanyPage } from "@renderer/components/company/company-page"
import { AccountPage } from "@renderer/components/account/account-page"
function RootLayout() {
  useAgentSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key === ",") {
        event.preventDefault()
        void navigate({ to: "/settings/$section", params: { section: "general" } })
        return
      }
      if (
        event.key === "Escape" &&
        (pathname.startsWith("/settings") ||
          pathname.startsWith("/studio") ||
          pathname.startsWith("/automations") ||
          pathname.startsWith("/customize") ||
          pathname.startsWith("/knowledge") ||
          pathname.startsWith("/workflows") ||
          pathname.startsWith("/media") ||
          pathname.startsWith("/mcp") ||
          pathname.startsWith("/observability"))
      ) {
        event.preventDefault()
        void navigate({ to: "/" })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate, pathname])

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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AiChatShell
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  beforeLoad: ({ params }) => {
    if (!isSettingsSectionId(params.section)) {
      throw redirect({ to: "/settings/$section", params: { section: "general" } })
    }
  },
  component: SettingsSectionPage
})

const automationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/automations",
  component: AutomationsPage
})

const customizeIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customize",
  beforeLoad: () => {
    throw redirect({ to: "/customize/$section", params: { section: "instructions" } })
  }
})

const customizeSectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customize/$section",
  beforeLoad: ({ params }) => {
    if (!isCustomizeSectionId(params.section)) {
      throw redirect({ to: "/customize/$section", params: { section: "instructions" } })
    }
  },
  component: CustomizePage
})

const knowledgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/knowledge",
  component: KnowledgePage
})

const workflowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workflows",
  component: WorkflowsPage
})

const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: MediaPage
})

const mcpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mcp",
  component: McpPage
})

const observabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/observability",
  component: ObservabilityPage
})

const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/studio",
  component: AgentStudioPage
})
const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/team",
  component: TeamPage
})

const teamIndexRoute = createRoute({
  getParentRoute: () => teamRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/team/$section", params: { section: "profile" } })
  }
})

const teamSectionRoute = createRoute({
  getParentRoute: () => teamRoute,
  path: "$section",
  component: TeamPage
})

const workspacesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces",
  component: WorkspacesPage
})

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inbox",
  component: InboxPage
})

const companyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/company",
  component: CompanyPage
})

const companyIndexRoute = createRoute({
  getParentRoute: () => companyRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/company/$section", params: { section: "billing" } })
  }
})

const companySectionRoute = createRoute({
  getParentRoute: () => companyRoute,
  path: "$section",
  component: CompanyPage
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage
})

const accountIndexRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/account/$section", params: { section: "profile" } })
  }
})

const accountSectionRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "$section",
  component: AccountPage
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute.addChildren([settingsIndexRoute, settingsSectionRoute]),
  studioRoute,
  automationsRoute,
  customizeIndexRoute,
  customizeSectionRoute,
  knowledgeRoute,
  workflowsRoute,
  mediaRoute,
  mcpRoute,
  observabilityRoute,
  teamRoute.addChildren([teamIndexRoute, teamSectionRoute]),
  workspacesRoute,
  inboxRoute,
  companyRoute.addChildren([companyIndexRoute, companySectionRoute]),
  accountRoute.addChildren([accountIndexRoute, accountSectionRoute])
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
