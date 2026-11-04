/**
 * 工作区文件 / diff / 变更列表合约。
 */
import { z } from "zod"
import { SshAuth } from "./workspace-remote.ts"

export const OpenWorkspaceInput = z.object({
  path: z.string().optional(),
  /** 创建或重开时写入 workspaces.name；缺省用路径 basename */
  name: z.string().min(1).max(120).optional()
})
export type OpenWorkspaceInput = z.infer<typeof OpenWorkspaceInput>

/** 只选目录，不写入 workspaces 表。 */
export const PickFolderResult = z.object({
  path: z.string(),
  name: z.string()
})
export type PickFolderResult = z.infer<typeof PickFolderResult>

export const RemoveWorkspaceInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type RemoveWorkspaceInput = z.infer<typeof RemoveWorkspaceInput>

/** 删除后带回按 MRU 收口的 lastWorkspaceId，避免 renderer 读到旧 settings 缓存。 */
export const RemoveWorkspaceResult = z
  .object({
    id: z.string().min(1),
    lastWorkspaceId: z.string().min(1).nullable()
  })
  .strict()
export type RemoveWorkspaceResult = z.infer<typeof RemoveWorkspaceResult>

export const WorkspaceIdInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type WorkspaceIdInput = z.infer<typeof WorkspaceIdInput>

export const ReadFileInput = z.object({
  workspaceId: z.string(),
  path: z.string()
})
export type ReadFileInput = z.infer<typeof ReadFileInput>

/** 用户在 Files 里保存；路径必须 jail。任意保存可触发 on_save（防抖）；可选 sessionId 复用会话。 */
export const WriteFileInput = z
  .object({
    workspaceId: z.string().min(1),
    path: z.string().min(1),
    content: z.string(),
    sessionId: z.string().min(1).optional()
  })
  .strict()
export type WriteFileInput = z.infer<typeof WriteFileInput>

/** Files 树拖拽移动。toDir 是目标目录（`.` 为工作区根），不是最终文件路径。 */
export const MoveWorkspacePathInput = z
  .object({
    workspaceId: z.string().min(1),
    from: z.string().min(1),
    toDir: z.string().min(1)
  })
  .strict()
export type MoveWorkspacePathInput = z.infer<typeof MoveWorkspacePathInput>

export const MoveWorkspacePathResult = z
  .object({
    ok: z.literal(true),
    from: z.string().min(1),
    to: z.string().min(1)
  })
  .strict()
export type MoveWorkspacePathResult = z.infer<typeof MoveWorkspacePathResult>

export const WatchWorkspaceInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type WatchWorkspaceInput = z.infer<typeof WatchWorkspaceInput>

export const FileDiffInput = z.object({
  workspaceId: z.string(),
  path: z.string(),
  ignoreWhitespace: z.boolean().optional()
})
export type FileDiffInput = z.infer<typeof FileDiffInput>

export const FileDiffResult = z.object({
  path: z.string(),
  diff: z.string(),
  additions: z.number(),
  deletions: z.number()
})
export type FileDiffResult = z.infer<typeof FileDiffResult>

export const ListDirInput = z.object({
  workspaceId: z.string(),
  path: z.string().default(".")
})
export type ListDirInput = z.infer<typeof ListDirInput>

export const WorkspaceSummary = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  kind: z.enum(["local", "ssh"]).default("local"),
  sshHost: z.string().optional(),
  sshUser: z.string().optional(),
  sshPort: z.number().int().optional(),
  sshAuth: SshAuth.optional(),
  sshKeyPath: z.string().optional(),
  remotePath: z.string().optional(),
  sshStatus: z.enum(["idle", "connecting", "connected", "failed", "disconnected"]).optional(),
  sshHostId: z.string().optional()
})
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>

export const FileEntry = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.enum(["file", "directory"]),
  size: z.number().optional()
})
export type FileEntry = z.infer<typeof FileEntry>

/** main → renderer 推送：工作区文件变化（path 为相对根的路径，"." 表示指纹轮询的粗粒度信号）。 */
export const WorkspaceChangedEvent = z.object({
  workspaceId: z.string().min(1),
  path: z.string().min(1)
})
export type WorkspaceChangedEvent = z.infer<typeof WorkspaceChangedEvent>

export const ChangedFile = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted", "untracked"]),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  staged: z.boolean().default(false),
  worktree: z.boolean().default(false)
})
export type ChangedFile = z.infer<typeof ChangedFile>

/** workspace.changes：把「不是 git 仓库」和「仓库很干净」拆开。旧客户端只收数组。 */
export const WorkspaceChangesResult = z.object({
  files: z.array(ChangedFile),
  gitRepo: z.boolean().optional()
})
export type WorkspaceChangesResult = z.infer<typeof WorkspaceChangesResult>

/** 兼容旧数组回包。 */
export function readWorkspaceChangesResult(raw: unknown): WorkspaceChangesResult {
  if (Array.isArray(raw)) return { files: raw.map((row) => ChangedFile.parse(row)) }
  return WorkspaceChangesResult.parse(raw)
}

export const GitCommitItem = z.object({
  hash: z.string(),
  shortHash: z.string(),
  message: z.string(),
  authorName: z.string(),
  authorEmail: z.string().default(""),
  relativeTime: z.string().default(""),
  date: z.string().default(""),
  filesChanged: z.number().default(0),
  additions: z.number().default(0),
  deletions: z.number().default(0)
})
export type GitCommitItem = z.infer<typeof GitCommitItem>

export const GitLogInput = z.object({
  workspaceId: z.string().min(1),
  limit: z.number().default(30).optional(),
  includeBranchFiles: z.boolean().optional()
})
export type GitLogInput = z.infer<typeof GitLogInput>

export const GitLogResult = z.object({
  branch: z.string().default(""),
  upstream: z.string().default(""),
  branchFiles: z.array(ChangedFile).default([]),
  commits: z.array(GitCommitItem)
})
export type GitLogResult = z.infer<typeof GitLogResult>

export const GitCommitInput = z.object({
  workspaceId: z.string().min(1),
  message: z.string().trim().min(1).max(4000),
  /** 默认只提交已暂存。true 才 `git add -A`（Agent 工具用）。 */
  stageAll: z.boolean().default(false)
})
export type GitCommitInput = z.infer<typeof GitCommitInput>

export const GitStageInput = z
  .object({
    workspaceId: z.string().min(1),
    paths: z.array(z.string().min(1)).min(1),
    action: z.enum(["add", "unstage"])
  })
  .strict()
export type GitStageInput = z.infer<typeof GitStageInput>

export const GitCommitResult = z.object({
  ok: z.boolean(),
  output: z.string().default("")
})
export type GitCommitResult = z.infer<typeof GitCommitResult>

export const GitPushInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type GitPushInput = z.infer<typeof GitPushInput>

export const GitBranchItem = z.object({
  name: z.string().min(1),
  current: z.boolean()
})
export type GitBranchItem = z.infer<typeof GitBranchItem>

export const GitBranchesResult = z.object({
  current: z.string().default(""),
  branches: z.array(GitBranchItem)
})
export type GitBranchesResult = z.infer<typeof GitBranchesResult>

export const GitSwitchInput = z
  .object({
    workspaceId: z.string().min(1),
    name: z.string().trim().min(1).max(200)
  })
  .strict()
export type GitSwitchInput = z.infer<typeof GitSwitchInput>

export const GitSwitchResult = z.object({
  ok: z.boolean(),
  branch: z.string().default(""),
  code: z.enum(["GIT_SWITCH_DIRTY", "GIT_SWITCH_FAILED"]).optional(),
  error: z.string().optional()
})
export type GitSwitchResult = z.infer<typeof GitSwitchResult>

export const GitPatchInput = z
  .object({
    workspaceId: z.string().min(1),
    paths: z.array(z.string()).optional()
  })
  .strict()
export type GitPatchInput = z.infer<typeof GitPatchInput>

export const GitPatchResult = z.object({
  patch: z.string().default("")
})
export type GitPatchResult = z.infer<typeof GitPatchResult>

/** 改动条「全部撤销」：按路径 restore 已跟踪文件、删除未跟踪文件。 */
export const GitRestoreInput = z
  .object({
    workspaceId: z.string().min(1),
    paths: z.array(z.string().trim().min(1).max(500)).min(1).max(200)
  })
  .strict()
export type GitRestoreInput = z.infer<typeof GitRestoreInput>

export const GitRestoreResult = z.object({
  ok: z.boolean(),
  restored: z.number().int().nonnegative()
})
export type GitRestoreResult = z.infer<typeof GitRestoreResult>

/** Agent 写盘快照。ref 必须是 refs/enjoy/checkpoints/<stamp>。 */
export const EnjoyCheckpointItem = z.object({
  ref: z.string().min(1),
  sha: z.string().min(1),
  createdAt: z.number().int().positive(),
  sessionId: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  kind: z.enum(["baseline", "turn"]).optional()
})
export type EnjoyCheckpointItem = z.infer<typeof EnjoyCheckpointItem>

export { pickTurnBaseline } from "./checkpoint-pick.ts"

export const ListCheckpointsResult = z.object({
  checkpoints: z.array(EnjoyCheckpointItem)
})
export type ListCheckpointsResult = z.infer<typeof ListCheckpointsResult>

const EnjoyCheckpointRef = z.string().regex(/^refs\/enjoy\/checkpoints\/\d+$/)

export const PreviewCheckpointInput = z
  .object({
    workspaceId: z.string().min(1),
    ref: EnjoyCheckpointRef
  })
  .strict()
export type PreviewCheckpointInput = z.infer<typeof PreviewCheckpointInput>

export const PreviewCheckpointResult = z.object({
  ref: z.string().min(1),
  sha: z.string().min(1),
  untrackedToDelete: z.array(z.string()),
  trackedToDelete: z.array(z.string())
})
export type PreviewCheckpointResult = z.infer<typeof PreviewCheckpointResult>

export const RestoreCheckpointInput = z
  .object({
    workspaceId: z.string().min(1),
    ref: EnjoyCheckpointRef,
    /** 快照外未跟踪文件会删除；有此类路径时必须为 true。 */
    confirmDeleteUntracked: z.boolean().optional()
  })
  .strict()
export type RestoreCheckpointInput = z.infer<typeof RestoreCheckpointInput>

export const RestoreCheckpointResult = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    restored: z.number().int().nonnegative()
  }),
  z.object({
    ok: z.literal(false),
    code: z.literal("CHECKPOINT_CONFIRM_REQUIRED"),
    untrackedToDelete: z.array(z.string())
  })
])
export type RestoreCheckpointResult = z.infer<typeof RestoreCheckpointResult>

/** P2 切片①：开拉取请求探针 / 创建 / 会话挂 PR。 */

export const PrProbeReason = z.enum([
  "ok",
  "not-git",
  "no-upstream",
  "no-commits",
  "not-authed",
  "ssh-unsupported"
])
export type PrProbeReason = z.infer<typeof PrProbeReason>

export const WorkspacePrProbeInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type WorkspacePrProbeInput = z.infer<typeof WorkspacePrProbeInput>

export const PrAuthStatus = z.enum(["logged-in", "logged-out", "unknown"])
export type PrAuthStatus = z.infer<typeof PrAuthStatus>

export const WorkspacePrProbeResult = z.object({
  reason: PrProbeReason,
  branch: z.string().default(""),
  upstream: z.string().default(""),
  aheadCount: z.number().int().nonnegative().default(0),
  draftTitle: z.string().default(""),
  draftBody: z.string().default(""),
  existingPrNumber: z.number().int().positive().optional(),
  existingPrUrl: z.string().optional(),
  authStatus: PrAuthStatus.default("unknown"),
  authLogin: z.string().optional(),
  stub: z.boolean().optional()
})
export type WorkspacePrProbeResult = z.infer<typeof WorkspacePrProbeResult>

export const WorkspacePrCreateInput = z
  .object({
    workspaceId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20000).default("")
  })
  .strict()
export type WorkspacePrCreateInput = z.infer<typeof WorkspacePrCreateInput>

export const WorkspacePrCreateResult = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    number: z.number().int().positive(),
    url: z.string().min(1),
    title: z.string().default(""),
    stub: z.boolean().optional()
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["not-git", "no-upstream", "no-commits", "not-authed", "ssh-unsupported", "create-failed"]),
    message: z.string().default("")
  })
])
export type WorkspacePrCreateResult = z.infer<typeof WorkspacePrCreateResult>

export const AttachedPrItem = z.object({
  number: z.number().int().positive(),
  url: z.string().min(1),
  title: z.string().default("")
})
export type AttachedPrItem = z.infer<typeof AttachedPrItem>

export const SessionAttachedPrs = z.object({
  primary: z.number().int().positive().nullable(),
  items: z.array(AttachedPrItem).default([])
})
export type SessionAttachedPrs = z.infer<typeof SessionAttachedPrs>

export const SessionAttachedPrsGetInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type SessionAttachedPrsGetInput = z.infer<typeof SessionAttachedPrsGetInput>

export const SessionAttachedPrsSetInput = z
  .object({
    sessionId: z.string().min(1),
    attached: SessionAttachedPrs
  })
  .strict()
export type SessionAttachedPrsSetInput = z.infer<typeof SessionAttachedPrsSetInput>

export const WorkspacePrAuthStatusResult = z.object({
  authed: z.boolean(),
  login: z.string().optional(),
  stub: z.boolean().optional()
})
export type WorkspacePrAuthStatusResult = z.infer<typeof WorkspacePrAuthStatusResult>

export const WorkspacePrListResult = z.object({
  ok: z.boolean(),
  items: z.array(AttachedPrItem).default([]),
  message: z.string().optional()
})
export type WorkspacePrListResult = z.infer<typeof WorkspacePrListResult>

export const SessionAttachedPrAttachInput = z
  .object({
    sessionId: z.string().min(1),
    workspaceId: z.string().min(1),
    number: z.number().int().positive(),
    url: z.string().min(1),
    title: z.string().default(""),
    makePrimary: z.boolean().default(true)
  })
  .strict()
export type SessionAttachedPrAttachInput = z.infer<typeof SessionAttachedPrAttachInput>

export const SessionAttachedPrSetPrimaryInput = z
  .object({
    sessionId: z.string().min(1),
    number: z.number().int().positive()
  })
  .strict()
export type SessionAttachedPrSetPrimaryInput = z.infer<typeof SessionAttachedPrSetPrimaryInput>


/** P2 切片② · 盯 PR：本机最小轮询；禁云 7×24 / 自动 merge。 */
export const PrBabysitWakeKind = z.enum(["checks-failed", "new-comments", "conflict"])
export type PrBabysitWakeKind = z.infer<typeof PrBabysitWakeKind>

export const WorkspacePrBabysitStartInput = z
  .object({
    sessionId: z.string().min(1),
    workspaceId: z.string().min(1),
    number: z.number().int().positive(),
    url: z.string().min(1).default("")
  })
  .strict()
export type WorkspacePrBabysitStartInput = z.infer<typeof WorkspacePrBabysitStartInput>

export const WorkspacePrBabysitStopInput = z
  .object({
    sessionId: z.string().min(1),
    number: z.number().int().positive()
  })
  .strict()
export type WorkspacePrBabysitStopInput = z.infer<typeof WorkspacePrBabysitStopInput>

export const WorkspacePrBabysitStatusInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type WorkspacePrBabysitStatusInput = z.infer<typeof WorkspacePrBabysitStatusInput>

export const PrBabysitWatchItem = z.object({
  sessionId: z.string().min(1),
  workspaceId: z.string().min(1),
  number: z.number().int().positive(),
  url: z.string().default(""),
  startedAt: z.number().int().nonnegative(),
  lastPolledAt: z.number().int().nonnegative().nullable().optional(),
  lastWakeKind: PrBabysitWakeKind.nullable().optional()
})
export type PrBabysitWatchItem = z.infer<typeof PrBabysitWatchItem>

export const WorkspacePrBabysitStatusResult = z.object({
  watching: z.array(PrBabysitWatchItem).default([])
})
export type WorkspacePrBabysitStatusResult = z.infer<typeof WorkspacePrBabysitStatusResult>

export const WorkspacePrBabysitStartResult = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    item: PrBabysitWatchItem,
    stub: z.boolean().optional()
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["not-authed", "not-attached", "not-git", "start-failed"]),
    message: z.string().default("")
  })
])
export type WorkspacePrBabysitStartResult = z.infer<typeof WorkspacePrBabysitStartResult>

export const WorkspacePrBabysitEvent = z.object({
  type: z.enum(["status", "wake"]),
  sessionId: z.string().min(1),
  number: z.number().int().positive(),
  watching: z.boolean(),
  wakeKind: PrBabysitWakeKind.optional(),
  stub: z.boolean().optional()
})
export type WorkspacePrBabysitEvent = z.infer<typeof WorkspacePrBabysitEvent>


export const WorkspacePrCheckInput = z
  .object({
    workspaceId: z.string().min(1),
    number: z.number().int().positive()
  })
  .strict()
export type WorkspacePrCheckInput = z.infer<typeof WorkspacePrCheckInput>

export const WorkspacePrCheckResult = z.object({
  ok: z.boolean(),
  number: z.number().int().positive(),
  checksState: z.enum(["success", "failure", "pending", "unknown"]).default("unknown"),
  commentCount: z.number().int().nonnegative().default(0),
  mergeable: z.string().default(""),
  message: z.string().optional(),
  stub: z.boolean().optional()
})
export type WorkspacePrCheckResult = z.infer<typeof WorkspacePrCheckResult>
