import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AiChatShell } from "@renderer/components/ai-chat/ai-chat-shell"
import { TooltipProvider } from "@/components/ui/tooltip"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AiChatShell />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
