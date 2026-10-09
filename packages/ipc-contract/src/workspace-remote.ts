/**
 * SSH 远程工作区合约：位置不是引擎。
 * renderer 可见 host/user/port/keyPath；登录密码只写不读（list/事件不含）。
 */
import { z } from "zod"

export const WorkspaceKind = z.enum(["local", "ssh"])
export type WorkspaceKind = z.infer<typeof WorkspaceKind>

export const SshAuth = z.enum(["agent", "keypath", "password"])
export type SshAuth = z.infer<typeof SshAuth>

/** 写通道：明文只走 IPC 一次，main 进 safeStorage。 */
const SshPassword = z.string().min(1).max(256).optional()

function refineSshAuth(
  value: { auth: SshAuth; keyPath?: string; password?: string; id?: string; hostId?: string },
  ctx: z.RefinementCtx
) {
  if (value.auth === "keypath" && !value.keyPath?.trim()) {
    ctx.addIssue({ code: "custom", message: "keyPath required when auth is keypath", path: ["keyPath"] })
  }
  if (value.auth !== "password") return
  if (value.password?.trim()) return
  if (value.id || value.hostId) return
  ctx.addIssue({ code: "custom", message: "password required when auth is password", path: ["password"] })
}

export const SshStatus = z.enum(["idle", "connecting", "connected", "failed", "disconnected"])
export type SshStatus = z.infer<typeof SshStatus>

export const OpenSshWorkspaceInput = z
  .object({
    hostId: z.string().min(1).optional(),
    host: z.string().min(1),
    user: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(22),
    auth: SshAuth,
    keyPath: z.string().min(1).optional(),
    password: SshPassword,
    remotePath: z.string().min(1),
    name: z.string().min(1).max(120).optional(),
    source: z.enum(["manual", "ssh_config", "wsl"]).optional()
  })
  .strict()
  .superRefine(refineSshAuth)
export type OpenSshWorkspaceInput = z.infer<typeof OpenSshWorkspaceInput>

export const SshHostSource = z.enum(["manual", "ssh_config", "wsl"])
export type SshHostSource = z.infer<typeof SshHostSource>

export const SshHostUpsertInput = z
  .object({
    id: z.string().min(1).optional(),
    alias: z.string().min(1).max(120),
    host: z.string().min(1),
    user: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(22),
    auth: SshAuth,
    keyPath: z.string().min(1).optional(),
    password: SshPassword,
    source: SshHostSource.optional()
  })
  .strict()
  .superRefine(refineSshAuth)
export type SshHostUpsertInput = z.infer<typeof SshHostUpsertInput>

export const SshHostRemoveInput = z.object({ id: z.string().min(1) }).strict()
export type SshHostRemoveInput = z.infer<typeof SshHostRemoveInput>

export const SshHostProject = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    remotePath: z.string()
  })
  .strict()
export type SshHostProject = z.infer<typeof SshHostProject>

export const SshHost = z
  .object({
    id: z.string().min(1),
    alias: z.string(),
    host: z.string(),
    user: z.string(),
    port: z.number().int(),
    auth: SshAuth,
    keyPath: z.string().optional(),
    source: SshHostSource,
    workspaceCount: z.number().int().nonnegative(),
    workspaces: z.array(SshHostProject)
  })
  .strict()
export type SshHost = z.infer<typeof SshHost>

export const SshConfigCandidate = z
  .object({
    alias: z.string().min(1),
    host: z.string().min(1),
    user: z.string().optional(),
    port: z.number().int().optional(),
    identityFile: z.string().optional(),
    source: SshHostSource.optional()
  })
  .strict()
export type SshConfigCandidate = z.infer<typeof SshConfigCandidate>

export const SshProbeInput = z
  .object({
    hostId: z.string().min(1).optional(),
    host: z.string().min(1).optional(),
    user: z.string().min(1).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    auth: SshAuth.optional(),
    keyPath: z.string().min(1).optional(),
    password: SshPassword,
    source: SshHostSource.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.hostId) return
    if (!value.host?.trim() || !value.user?.trim()) {
      ctx.addIssue({ code: "custom", message: "hostId or host+user required" })
    }
    refineSshAuth({ auth: value.auth ?? (value.keyPath ? "keypath" : value.password ? "password" : "agent"), keyPath: value.keyPath, password: value.password }, ctx)
  })
export type SshProbeInput = z.infer<typeof SshProbeInput>

export const SshProbeResult = z.object({ ok: z.boolean(), error: z.string().optional() }).strict()
export type SshProbeResult = z.infer<typeof SshProbeResult>

export const SshBrowseInput = SshProbeInput.extend({
  path: z.string().max(1024).optional()
}).strict()
export type SshBrowseInput = z.infer<typeof SshBrowseInput>

export const SshBrowseEntry = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["file", "directory"])
  })
  .strict()
export type SshBrowseEntry = z.infer<typeof SshBrowseEntry>

export const SshBrowseResult = z
  .object({
    path: z.string().min(1),
    home: z.string().min(1),
    parent: z.string().nullable(),
    entries: z.array(SshBrowseEntry)
  })
  .strict()
export type SshBrowseResult = z.infer<typeof SshBrowseResult>

export const WorkspaceConnectInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type WorkspaceConnectInput = z.infer<typeof WorkspaceConnectInput>

export const WorkspaceRemoteEvent = z.object({
  workspaceId: z.string().min(1),
  status: SshStatus,
  label: z.string(),
  error: z.string().optional()
})
export type WorkspaceRemoteEvent = z.infer<typeof WorkspaceRemoteEvent>

/** 打开 ~/.ssh/config；path 只允许指向 ~/.ssh 内，越界由 main 拒绝。 */
export const OpenSshConfigInput = z
  .object({
    path: z.string().min(1).max(1024).optional()
  })
  .strict()
export type OpenSshConfigInput = z.infer<typeof OpenSshConfigInput>

export const OpenSshConfigResult = z
  .object({
    ok: z.boolean(),
    path: z.string(),
    error: z.string().optional()
  })
  .strict()
export type OpenSshConfigResult = z.infer<typeof OpenSshConfigResult>

export const REMOTE_DISCONNECTED = "REMOTE_DISCONNECTED"
export const REMOTE_NOT_READY = "REMOTE_NOT_READY"
export const HOST_IN_USE = "HOST_IN_USE"

