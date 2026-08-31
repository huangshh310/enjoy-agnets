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
import { WindowFrame } from "@renderer/components/layout/window-frame"
import { useAgentSession } from "@renderer/hooks/use-agent-session"

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

const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute.addChildren([settingsIndexRoute, settingsSectionRoute]),
  automationsRoute,
  customizeIndexRoute,
  customizeSectionRoute,
  knowledgeRoute,
  workflowsRoute,
  mediaRoute,
  mcpRoute,
  observabilityRoute
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
