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

export const ReadFileInput = z.object({
  workspaceId: z.string(),
  path: z.string()
})
export type ReadFileInput = z.infer<typeof ReadFileInput>

export const FileDiffInput = z.object({
  workspaceId: z.string(),
  path: z.string()
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
  deletions: z.number().default(0)
})
export type ChangedFile = z.infer<typeof ChangedFile>
