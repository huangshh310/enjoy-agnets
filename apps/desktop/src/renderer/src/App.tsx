import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@renderer/i18n"
import { queryClient } from "@renderer/lib/query-client"
import { router } from "@renderer/router"
import { Toaster } from "@/components/ui/sonner"
import { initThemeSkin } from "@renderer/hooks/use-theme-skin"
import { installEnjoyE2eBridge } from "@renderer/lib/enjoy-e2e-bridge"
import { SessionFocusReporter } from "@renderer/hooks/session-focus-reporter"

initThemeSkin()
installEnjoyE2eBridge()
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <SessionFocusReporter />
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
