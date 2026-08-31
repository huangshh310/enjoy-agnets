/**
 * 渲染进程共享 QueryClient，避免 lifecycle 钩子回引 App。
 */
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
})
