/**
 * 把 Hash pathname 收成 AppShell 模块。旧账号页在 redirect 生效前也落到 Settings。
 */
import {
  OVERLAY_MODULE_IDS,
  WORK_MODULE_IDS,
  type AppModuleId,
  type OverlayModuleId,
  type WorkModuleId
} from "../app-shell.types.ts"
import { WORK_MODULE_PATHS } from "../constants.ts"

const SETTINGS_PREFIXES = [
  "/settings",
  "/automations",
  "/customize",
  "/team",
  "/company",
  "/account",
  "/workspaces"
] as const

const MODULE_PREFIXES: Array<{ prefix: string; id: AppModuleId }> = [
  ...(Object.entries(WORK_MODULE_PATHS) as Array<[WorkModuleId, string]>)
    .filter(([id]) => id !== "chat")
    .map(([id, prefix]) => ({ prefix, id })),
  { prefix: "/inbox", id: "inbox" },
  ...SETTINGS_PREFIXES.map((prefix) => ({ prefix, id: "settings" as const }))
]

export function matchAppModule(pathname: string): AppModuleId {
  const hit = MODULE_PREFIXES.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`)
  )
  return hit?.id ?? "chat"
}

export function isWorkModule(id: AppModuleId): id is WorkModuleId {
  return (WORK_MODULE_IDS as readonly string[]).includes(id)
}

export function isOverlayModule(id: AppModuleId): id is OverlayModuleId {
  return (OVERLAY_MODULE_IDS as readonly string[]).includes(id)
}

export function pathForWorkModule(id: WorkModuleId): string {
  return WORK_MODULE_PATHS[id]
}
