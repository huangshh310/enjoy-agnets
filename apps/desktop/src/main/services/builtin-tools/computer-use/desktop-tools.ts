/**
 * Enjoy Local 的 Computer Use 工具。执行在 main，观察用过即废。
 */
// @ts-nocheck — 与 createCodingTools 相同：AI SDK Tool 泛型与 Zod 4 不合。
import { tool } from "ai"
import { z } from "zod"
import { checkDesktopPermissions } from "../builtin-tools-state"
import { createDesktopSession, type ActInput, type DesktopSession } from "./desktop-session"
import { captureDesktopThumb, getLastDesktopView, readThumbDataUrl, setLastDesktopView } from "./desktop-thumbs"
import { startExecutor, type ExecutorHandle } from "./executor-client"
import { resolveExecutorCommand } from "./executor-command"

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
    onView: setLastDesktopView
  })
  return singleton
}

/** 开关打开时注册的五只工具。探索模式不走到这里。 */
export function desktopControlTools(session = sharedSession()) {
  return { ...readTools(session), desktop_act: actTool(session) }
}

export async function resumeDesktopAct(args: Record<string, unknown>) {
  return sharedSession().act(args as ActInput)
}

export async function runDesktopDoctor() {
  const report = await sharedSession().doctor()
  return { ...report, line: doctorLine(report) }
}

export async function readDesktopView() {
  const view = getLastDesktopView()
  if (!view) return null
  const thumbnailDataUrl = await readThumbDataUrl(view.thumbnailPath)
  return { ...view, thumbnailDataUrl }
}

function doctorLine(report: Record<string, unknown>): string {
  if (report.code === "executor_missing") return "找不到桌面执行器。开发机需要 swiftc / python3 / PowerShell；安装包应带 bin/<platform>-<arch>/computer-use。"
  if (report.code === "no_display") return "没有图形会话（没有 DISPLAY / WAYLAND_DISPLAY）。"
  if (report.code === "permission_denied" || report.trusted === false || report.accessibility === false) {
    return "辅助功能还没授给执行器进程。"
  }
  if (report.session === "wayland") return "Wayland 没有后台点击，动作会先停在审批卡。"
  if (report.backgroundClick === true) return "后台点击可用。"
  return typeof report.message === "string" ? report.message : "桌面执行器已连接。"
}

export function enrichDesktopActArgs(args: Record<string, unknown>): Record<string, unknown> {
  const id = typeof args.observationId === "string" ? args.observationId : ""
  const observation = sharedSession().peek(id)
  if (!observation) return args
  const element = observation.elements.find((item) => item.id === args.elementId)
  return {
    ...args,
    appName: observation.appName,
    elementName: element?.name ?? (typeof args.x === "number" ? "坐标" : args.elementName),
    elementRole: element?.role,
    thumbnailPath: observation.thumbnailPath
  }
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
    execute: async (input) => session.act(input)
  })
}

function openExecutor(): ExecutorHandle | null {
  const command = resolveExecutorCommand()
  if (!command) return null
  return startExecutor(command.command, command.args)
}
