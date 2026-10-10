import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@renderer/i18n"
import { queryClient } from "@renderer/lib/query-client"
import { router } from "@renderer/router"
import { AppToaster } from "@renderer/components/layout/app-toaster"
import { initThemeSkin } from "@renderer/hooks/use-theme-skin"

initThemeSkin()
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <AppToaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
