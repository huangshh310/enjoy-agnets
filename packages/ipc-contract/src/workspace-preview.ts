/**
 * 在系统浏览器打开工作区 html / 本机预览 URL。
 * 只认 localhost 环回，禁止远程与 file/javascript。
 */
import { z } from "zod"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"])

export const OpenWorkspacePreviewInput = z
  .object({
    workspaceId: z.string().min(1),
    path: z.string().trim().min(1).max(500).optional(),
    url: z.string().trim().min(1).max(2000).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Boolean(value.path) === Boolean(value.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PREVIEW_TARGET_REQUIRED"
      })
    }
  })
export type OpenWorkspacePreviewInput = z.infer<typeof OpenWorkspacePreviewInput>

export const OpenWorkspacePreviewResult = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    code: z.enum(["PREVIEW_NOT_ALLOWED", "PREVIEW_NOT_FOUND", "PREVIEW_TARGET_REQUIRED"])
  })
])
export type OpenWorkspacePreviewResult = z.infer<typeof OpenWorkspacePreviewResult>

/** 工作区相对路径且后缀是 html / htm。 */
export function isWorkspaceHtmlPath(raw: string | null | undefined): boolean {
  const path = normalizeWorkspacePath(raw)
  if (!path) return false
  return /\.html?$/i.test(path)
}

export function normalizeWorkspacePath(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const path = raw.replace(/\\/g, "/").replace(/^\.\//, "").trim()
  if (!path || path.startsWith("/") || path.includes("..")) return null
  return path
}

const LOCAL_PREVIEW_RE =
  /^(https?):\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(\/[^]*)?$/i

/**
 * 只接受本机预览 http(s)。0.0.0.0 改写成 127.0.0.1。
 * 不用全局 URL：ipc-contract tsconfig 只有 ES2022，没有 DOM / Node types。
 */
export function parseLocalPreviewUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const match = LOCAL_PREVIEW_RE.exec(raw.trim())
  if (!match) return null
  const protocol = (match[1] ?? "http").toLowerCase()
  const hostToken = (match[2] ?? "").toLowerCase()
  if (!LOCAL_HOSTS.has(hostToken.replace(/^\[|\]$/g, ""))) return null
  const host = hostToken === "0.0.0.0" ? "127.0.0.1" : hostToken
  const port = match[3] ?? ""
  const path = match[4] ?? "/"
  return `${protocol}://${host}${port}${path}`
}

const LOCAL_URL_RE =
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::\d+)?(?:\/[^\s"'<>]*)?/gi

/** 从一段文本里抽出最近一条本机预览 URL。 */
export function extractLocalPreviewUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const matches = text.match(LOCAL_URL_RE)
  if (!matches?.length) return null
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const href = parseLocalPreviewUrl(matches[i])
    if (href) return href
  }
  return null
}
