/**
 * 资产库 IPC：导入、列表、读取、导出（需审批）、删除。
 * 二进制只落 userData/assets；合约里只有元数据。
 */
import { z } from "zod"

export const AssetKind = z.enum(["image", "audio", "video", "pdf", "file"])
export type AssetKind = z.infer<typeof AssetKind>

export const AssetRecord = z.object({
  id: z.string(),
  name: z.string(),
  kind: AssetKind,
  mediaType: z.string(),
  size: z.number().int().nonnegative(),
  hash: z.string(),
  source: z.enum(["import", "generated", "upload"]),
  createdAt: z.number().int(),
  experimental: z.boolean().optional()
})
export type AssetRecord = z.infer<typeof AssetRecord>

export const AssetsImportInput = z
  .object({
    name: z.string().min(1),
    mediaType: z.string().min(1),
    bytesBase64: z.string().min(1).max(12_000_000)
  })
  .strict()
export type AssetsImportInput = z.infer<typeof AssetsImportInput>

export const AssetsReadInput = z.object({ id: z.string().min(1) }).strict()
export type AssetsReadInput = z.infer<typeof AssetsReadInput>

export const AssetsExportInput = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    relativePath: z.string().min(1),
    overwrite: z.boolean().default(false)
  })
  .strict()
export type AssetsExportInput = z.infer<typeof AssetsExportInput>

export const AssetsDeleteInput = z.object({ id: z.string().min(1) }).strict()
export type AssetsDeleteInput = z.infer<typeof AssetsDeleteInput>

export const AssetsUploadInput = z
  .object({
    id: z.string().min(1),
    purpose: z.enum(["file", "skill"]).default("file")
  })
  .strict()
export type AssetsUploadInput = z.infer<typeof AssetsUploadInput>

export const AssetsExportPreview = z.object({
  targetPath: z.string(),
  exists: z.boolean(),
  overwriteRisk: z.boolean()
})
export type AssetsExportPreview = z.infer<typeof AssetsExportPreview>
