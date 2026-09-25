/**
 * Enjoy Local 的 Computer Use 工具。执行在 main，观察用过即废。
 */
// @ts-nocheck — 与 createCodingTools 相同：AI SDK Tool 泛型与 Zod 4 不合。
import {
  desktopActAppKeyInfo,
  desktopActBypassesSessionAllow,
  desktopAppKey,
  type Observation
} from "@enjoy-agents/agent-core/computer-use"
import { tool } from "ai"
import { z } from "zod"
import { checkDesktopPermissions } from "../builtin-tools-state"
import { currentToolRunId } from "../../active-run-id"
import { currentPumpingRunId } from "../../agent-run-state"
import { beginDesktopActOverlay, endDesktopActOverlay } from "../desktop-overlay-chrome"
import { resolveDesktopActRunId } from "../desktop-overlay-lifecycle"
import { createDesktopSession, type ActInput, type DesktopSession } from "./desktop-session"
import { formatDoctorLine } from "./doctor-report"
import {
  attachDesktopApprovalThumbs,
  forgetSecondConfirm,
  mergeSecondConfirmApprovalArgs
} from "./desktop-second-confirm"
import {
  confirmActArgs,
  enrichSecondConfirmApprovalArgs,
  hasDesktopSecondConfirmWait,
  isDesktopSecondConfirmResult,
  mergeSecondConfirmArgs,
  waitDesktopSecondConfirm
} from "./desktop-second-confirm-park"
import { captureDesktopThumb, getLastDesktopView, readThumbDataUrl, setLastDesktopView } from "./desktop-thumbs"
import { startExecutor, type ExecutorHandle } from "./executor-client"
import { mapListedDesktopApps } from "./map-listed-desktop-apps.ts"
import { resolveExecutorCommand } from "./executor-command"
import { readPreferences } from "../../preferences"

const actionSchema = z.enum(["click", "move", "drag", "scroll", "type", "key", "wait"])

const actSchema = z.object({
  observationId: z.string().min(1),
  action: actionSchema,
  elementId: z.string().optional(),
  button: z.enum(["left", "right", "middle"]).optional(),
  count: z.number().int().min(1).max(3).optional(),
  text: z.string().optional(),
  key: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  dy: z.number().optional(),
  allowForeground: z.boolean().optional(),
  waitMs: z.number().int().min(0).max(5000).optional(),
  appName: z.string().optional(),
  elementName: z.string().optional()
})

let singleton: DesktopSession | null = null

function sharedSession(): DesktopSession {
  singleton ??= createDesktopSession(openExecutor, {
    permissions: checkDesktopPermissions,
    captureThumb: () => captureDesktopThumb(),
    onView: setLastDesktopView,
    resolveCommand: () => resolveExecutorCommand(),
    onAct: (input, observation) => {
      beginDesktopActOverlay({
        action: input.action,
        appName: observation.appName,
        runId: resolveDesktopActRunId(undefined, currentToolRunId(), currentPumpingRunId())
      })
    },
    onActEnd: () => {
      endDesktopActOverlay()
    },
    advancedCoords: () => readPreferences().desktopAdvancedCoords === true
  })
  return singleton
}

/** 开关打开且非探索态才注册。Explore 走 desktop-tool-gate，不要调这里。 */
export function desktopControlTools(session = sharedSession()) {
  return { ...readTools(session), desktop_act: actTool(session) }
}

/** 用户停：拒绝在途 act。协议无 cancel RPC，执行器侧 kill 在途请求。 */
export function cancelInFlightDesktopAct(): void {
  singleton?.cancelInFlight()
}

export async function resumeDesktopAct(args: Record<string, unknown>) {
  return sharedSession().act(normalizeActInput(args))
}

/** 待批：冻结 TTL，并把账本里的应用/控件写进审批 args。 */
export function parkDesktopActArgs(args: Record<string, unknown>): Record<string, unknown> {
  const id = text(args.observationId)
  if (id) sharedSession().freeze(id)
  return enrichDesktopActArgs(args)
}

/** Deny：丢弃观察，不 act。 */
export function releaseParkedDesktopAct(args: Record<string, unknown> | unknown) {
  const id = args && typeof args === "object" ? text((args as Record<string, unknown>).observationId) : ""
  if (id) {
    sharedSession().release(id)
    forgetSecondConfirm(id)
  }
}

export async function runDesktopDoctor() {
  const report = await sharedSession().doctor()
  return { ...report, line: formatDoctorLine(report) }
}

/** Composer 提及用：与 desktop_list_apps 同源。抛错 / 失败都回空列表，不造假应用。 */
export async function listDesktopMentionAppsIpc() {
  try {
    return mapListedDesktopApps(await sharedSession().listApps())
  } catch {
    return mapListedDesktopApps({ success: false, code: "executor_missing" })
  }
}

export async function captureDesktopPreview() {
  const path = await captureDesktopThumb()
  if (!path) return { ok: false as const, code: "screenshot_unavailable" }
  const thumbnailDataUrl = await readThumbDataUrl(path)
  return thumbnailDataUrl
    ? { ok: true as const, thumbnailDataUrl }
    : { ok: false as const, code: "screenshot_unavailable" }
}

export async function readDesktopView() {
  const view = getLastDesktopView()
  if (!view) return null
  const thumbnailDataUrl = await readThumbDataUrl(view.thumbnailPath)
  return { ...view, thumbnailDataUrl }
}

export function enrichDesktopActArgs(args: Record<string, unknown>): Record<string, unknown> {
  const id = text(args.observationId)
  const observation = id ? sharedSession().lookup(id) : null
  const merged = observation ? mergeObservationIntoActArgs(args, observation) : args
  const info = desktopActAppKeyInfo({
    ...merged,
    appKey: observation?.appKey || desktopAppKey(observation ?? {}) || merged.appKey
  })
  return {
    ...merged,
    ...(info.appKey ? { appKey: info.appKey } : {}),
    ...(info.appKeySource ? { appKeySource: info.appKeySource } : {}),
    bypassesSessionAllow: desktopActBypassesSessionAllow(merged)
  }
}

function mergeObservationIntoActArgs(args: Record<string, unknown>, observation: Observation): Record<string, unknown> {
  const element = observation.elements.find((item) => item.id === args.elementId)
  return {
    ...args,
    appName: observation.appName,
    bundleId: observation.bundleId,
    exe: observation.exe,
    aumid: observation.aumid,
    pid: observation.pid,
    elementName: element?.name ?? (typeof args.x === "number" ? "坐标" : args.elementName),
    elementRole: element?.role,
    thumbnailPath: observation.thumbnailPath
  }
}

/** 审批卡用：同步账本字段，再补二次确认的批准时图，并转 data URL。 */
export async function enrichDesktopActApprovalArgs(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const enriched = mergeSecondConfirmApprovalArgs(enrichDesktopActArgs(args))
  return attachDesktopApprovalThumbs(enriched, readThumbDataUrl)
}

function normalizeActInput(args: Record<string, unknown>): ActInput {
  return {
    observationId: text(args.observationId) || "missing",
    action: text(args.action) || "click",
    elementId: optionalText(args.elementId),
    elementName: optionalText(args.elementName),
    elementRole: optionalText(args.elementRole),
    appName: optionalText(args.appName),
    appKey: optionalText(args.appKey),
    thumbnailPath: optionalText(args.thumbnailPath),
    pid: typeof args.pid === "number" ? args.pid : undefined,
    button: args.button === "right" || args.button === "middle" ? args.button : args.button === "left" ? "left" : undefined,
    count: typeof args.count === "number" ? args.count : undefined,
    allowForeground: args.allowForeground === true,
    text: optionalText(args.text),
    key: optionalText(args.key),
    x: typeof args.x === "number" ? args.x : undefined,
    y: typeof args.y === "number" ? args.y : undefined,
    x2: typeof args.x2 === "number" ? args.x2 : undefined,
    y2: typeof args.y2 === "number" ? args.y2 : undefined,
    dy: typeof args.dy === "number" ? args.dy : undefined,
    waitMs: typeof args.waitMs === "number" ? args.waitMs : undefined
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function optionalText(value: unknown): string | undefined {
  const next = text(value)
  return next || undefined
}

function readTools(session: DesktopSession) {
  return {
    desktop_doctor: tool({
      description: "Check desktop control permissions, the executor, and whether background clicks work on this OS.",
      inputSchema: z.object({}),
      execute: async () => session.doctor()
    }),
    desktop_list_apps: tool({
      description: "List running apps that can be controlled. Does not click.",
      inputSchema: z.object({}),
      execute: async () => session.listApps()
    }),
    desktop_snapshot: tool({
      description: "Capture an accessibility tree. The observationId is required by desktop_act and is single-use.",
      inputSchema: z.object({ pid: z.number().int().positive().optional() }),
      execute: async ({ pid }) => session.snapshot(pid)
    }),
    desktop_screenshot: tool({
      description: "Ask the host for a thumbnail when the tree has no target. Clicking still requires a later desktop_snapshot. The image is not returned to the model.",
      inputSchema: z.object({ pid: z.number().int().positive().optional() }),
      execute: async ({ pid }) => session.screenshot(pid)
    })
  }
}

function actTool(session: DesktopSession) {
  return tool({
    description: "Act on one element from desktop_snapshot. A spent or expired observationId is refused and nothing is clicked. needs_foreground means the same id can be retried with allowForeground after the user agrees.",
    inputSchema: actSchema,
    execute: async (input) => finishDesktopAct(session, input, await session.act(input))
  })
}

/** 活泵里重拍对不上：再停一张二次确认卡，确认后只点新观察。 */
async function finishDesktopAct(
  session: DesktopSession,
  input: ActInput,
  result: Record<string, unknown>
) {
  if (!isDesktopSecondConfirmResult(result) || !hasDesktopSecondConfirmWait()) return result
  const parked = await enrichSecondConfirmApprovalArgs(mergeSecondConfirmArgs({ ...input }, result))
  const decision = await waitDesktopSecondConfirm(parked)
  if (decision === "deny") {
    releaseParkedDesktopAct(parked)
    return { ...result, denied: true }
  }
  const confirmed = normalizeActInput(confirmActArgs(parked))
  return finishDesktopAct(session, confirmed, await session.act(confirmed))
}

function openExecutor(): ExecutorHandle | null {
  const command = resolveExecutorCommand()
  if (!command) return null
  return startExecutor(command.command, command.args)
}
