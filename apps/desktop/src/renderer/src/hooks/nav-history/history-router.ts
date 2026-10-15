/**
 * 历史跳转用到的路由（懒加载，避免 store 层静态拉进路由树）。行为测试在 node 里换成假路由，会话切换照常真走。
 */
type HistoryRouter = {
  navigate: (opts: { to: string; params?: never; search?: never }) => Promise<unknown>
  history: { subscribe: (listener: () => void) => () => void }
  state: { location: { pathname: string } }
}

let override: HistoryRouter | null = null

export async function loadHistoryRouter(): Promise<HistoryRouter> {
  if (override) return override
  const { router } = await import("@renderer/router")
  return router as unknown as HistoryRouter
}

export function setHistoryRouterForTest(next: HistoryRouter | null): void {
  override = next
}
