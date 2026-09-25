/**
 * builtin_tools 落盘形状。禁止写入会话 Allow / anyDesktop。
 */
export type PersistedBuiltinTools = {
  builtinBrowserEnabled?: boolean
  browserBridgeEnabled?: boolean
  computerUseEnabled?: boolean
  screenVisualsEnabled?: boolean
  bridgePort?: number
  bridgeToken?: string
}

/** 读旧 JSON 时丢掉 anyDesktopSession，写盘也不带回去。 */
export function persistableBuiltinTools(
  raw: PersistedBuiltinTools | Record<string, unknown>
): PersistedBuiltinTools {
  const row = raw as Record<string, unknown>
  return {
    builtinBrowserEnabled: asBool(row.builtinBrowserEnabled),
    browserBridgeEnabled: asBool(row.browserBridgeEnabled),
    computerUseEnabled: asBool(row.computerUseEnabled),
    screenVisualsEnabled: asBool(row.screenVisualsEnabled),
    bridgePort: typeof row.bridgePort === "number" ? row.bridgePort : undefined,
    bridgeToken: typeof row.bridgeToken === "string" ? row.bridgeToken : undefined
  }
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}
