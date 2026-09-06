/**
 * 工作区文件 / diff / 变更列表合约。
 */
import { z } from "zod"

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
  rootPath: z.string()
})
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>

export const FileEntry = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.enum(["file", "directory"]),
  size: z.number().optional()
})
export type FileEntry = z.infer<typeof FileEntry>

export const ChangedFile = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted", "untracked"]),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  staged: z.boolean().default(false),
  worktree: z.boolean().default(false)
})
export type ChangedFile = z.infer<typeof ChangedFile>

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
  stageAll: z.boolean().default(true)
})
export type GitCommitInput = z.infer<typeof GitCommitInput>

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
