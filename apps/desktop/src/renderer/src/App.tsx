import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AiChatShell } from "@/components/application/ai-chat/ai-chat-shell"

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
      <AiChatShell />
    </QueryClientProvider>
  )
}
