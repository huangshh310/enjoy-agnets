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
import { initThemeAccent } from "@renderer/hooks/use-theme-accent"
import { createEnjoyE2eBridge } from "@renderer/lib/enjoy-e2e-bridge"
import { installEnjoyE2eBridge } from "@renderer/lib/install-enjoy-e2e-bridge"
import { SessionFocusReporter } from "@renderer/hooks/session-focus-reporter"

initThemeSkin()
// 启动 / 刷新时把存下的强调色套到 <html>（data-accent + 行内 500/600）；之前没人调，重启后界面回到蓝色。
initThemeAccent()
installEnjoyE2eBridge(typeof window === "undefined" ? undefined : (window as never), createEnjoyE2eBridge)
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RendererErrorBoundary>
          <TooltipProvider>
            <CrashProbe />
            <SessionFocusReporter />
            <RouterProvider router={router} />
            <AppToaster />
          </TooltipProvider>
        </RendererErrorBoundary>
      </I18nProvider>
    </QueryClientProvider>
  )
}
