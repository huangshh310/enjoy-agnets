/**
 * 窗口控制相关 IPC 合约：最小化、最大化切换、关闭及窗口状态
 */
import { z } from "zod";

export const WindowState = z.object({
  isMaximized: z.boolean()
});
export type WindowState = z.infer<typeof WindowState>;

export const WindowActionResult = z.object({
  ok: z.boolean()
});
export type WindowActionResult = z.infer<typeof WindowActionResult>;

/** 空闲或用户确认后放行退出；无字段。 */
export const WindowForceQuitInput = z.object({}).strict();
export type WindowForceQuitInput = z.infer<typeof WindowForceQuitInput>;

/** 任务栏标签最长 80，换行去掉。空串由 main 恢复品牌标题。 */
export const TASKBAR_LABEL_MAX = 80;

export const WindowSetTaskbarTitleInput = z
  .object({
    label: z.string()
  })
  .strict()
  .transform((input) => ({
    label: input.label.replace(/[\r\n]+/g, " ").trim().slice(0, TASKBAR_LABEL_MAX)
  }));
export type WindowSetTaskbarTitleInput = z.infer<typeof WindowSetTaskbarTitleInput>;

/** 取 URL scheme（不含冒号）。无 scheme 或空串返回 null。不用 URL：本包 types 为空。 */
export function externalUrlScheme(raw: string): string | null {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

export function isAllowedExternalHttpScheme(scheme: string | null): boolean {
  return scheme === "http" || scheme === "https";
}

/** authority 含 @ 即 userinfo（user / user:pass）。不用 URL：本包 types 为空。 */
export function externalUrlHasUserinfo(raw: string): boolean {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)/.exec(raw.trim());
  return Boolean(match?.[1]?.includes("@"));
}

export const OpenExternalCode = z.enum(["OPEN_EXTERNAL_INVALID", "OPEN_EXTERNAL_NOT_ALLOWED"]);
export type OpenExternalCode = z.infer<typeof OpenExternalCode>;

export const WindowOpenExternalResult = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: OpenExternalCode })
]);
export type WindowOpenExternalResult = z.infer<typeof WindowOpenExternalResult>;

/** 终端链接等：Zod 先拒非 http(s) 与 userinfo；main 再用 URL 复验。失败回码，不抛。 */
export const WindowOpenExternalInput = z
  .object({
    url: z.string().trim().min(1).max(2048)
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      isAllowedExternalHttpScheme(externalUrlScheme(value.url)) &&
      !externalUrlHasUserinfo(value.url)
    ) {
      return;
    }
    ctx.addIssue({
      code: "custom",
      message: "OPEN_EXTERNAL_NOT_ALLOWED",
      path: ["url"]
    });
  });
export type WindowOpenExternalInput = z.infer<typeof WindowOpenExternalInput>;

export function parseWindowOpenExternalInput(
  raw: unknown
): { ok: true; url: string } | { ok: false; code: OpenExternalCode } {
  const parsed = WindowOpenExternalInput.safeParse(raw);
  if (parsed.success) return { ok: true, url: parsed.data.url };
  const notAllowed = parsed.error.issues.some((issue) => issue.message === "OPEN_EXTERNAL_NOT_ALLOWED");
  return { ok: false, code: notAllowed ? "OPEN_EXTERNAL_NOT_ALLOWED" : "OPEN_EXTERNAL_INVALID" };
}
