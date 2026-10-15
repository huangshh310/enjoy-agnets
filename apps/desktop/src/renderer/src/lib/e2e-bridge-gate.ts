/**
 * leo soft（#136）：会真打 agent.run / 上报焦点的桥成员只给 e2e stub（main 判 isE2eStub 后经 preload 标记）。
 */
export const E2E_STUB_ONLY_MEMBERS = ["runWithClientRequestId", "focusSession"] as const

export function e2eStubEnabled(win: unknown = typeof window === "undefined" ? undefined : window): boolean {
  return (win as { enjoyE2eStub?: unknown } | undefined)?.enjoyE2eStub === true
}

/** 非 stub 时摘掉 stub-only 成员；返回同一对象。 */
export function gateE2eStubMembers<T extends object>(bridge: T, stub: boolean): T {
  if (stub) return bridge
  for (const key of E2E_STUB_ONLY_MEMBERS) delete (bridge as Record<string, unknown>)[key]
  return bridge
}

/** installEnjoyE2eBridge 的最后一步：按窗口上的 stub 标记过闸后挂到 window.__enjoyE2e。 */
export function publishE2eBridge<T extends object>(win: { __enjoyE2e?: unknown; enjoyE2eStub?: unknown }, bridge: T): T {
  const gated = gateE2eStubMembers(bridge, e2eStubEnabled(win))
  win.__enjoyE2e = gated
  return gated
}
