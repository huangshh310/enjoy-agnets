import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CrashProbe } from "@renderer/components/layout/crash-fallback/crash-probe"
import { RendererErrorBoundary } from "@renderer/components/layout/crash-fallback/renderer-error-boundary"
import { I18nProvider } from "@renderer/i18n"
import { queryClient } from "@renderer/lib/query-client"
import { router } from "@renderer/router"
import { AppToaster } from "@renderer/components/layout/app-toaster"
import { initThemeSkin } from "@renderer/hooks/use-theme-skin"
import { installEnjoyE2eBridge } from "@renderer/lib/enjoy-e2e-bridge"

initThemeSkin()
installEnjoyE2eBridge()
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RendererErrorBoundary>
          <TooltipProvider>
            <CrashProbe />
            <RouterProvider router={router} />
            <AppToaster />
          </TooltipProvider>
        </RendererErrorBoundary>
      </I18nProvider>
    </QueryClientProvider>
  )
}
