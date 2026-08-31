/**
 * Knowledge 索引与检索。用户显式选路径；遵守忽略规则；失败不阻塞。
 */
import { readFile, readdir, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import {
  countSourceChunks,
  deleteSource,
  getSource,
  insertChunk,
  listDocuments,
  listSourceEmbeddingModels,
  listSources,
  resolveKnowledgePath,
  upsertSource
} from "@enjoy-agents/db"
import {
  canParse,
  chunkText,
  embeddingsNeedRebuild,
  parseDocument,
  parseGitignore,
  shouldIgnore
} from "@enjoy-agents/knowledge"
import { getDatabase } from "./database"
import { createId } from "./ids"
import {
  reembedStaleSource,
  resolveEmbeddingModelId,
  storeHashedEmbeddings,
  tryProviderEmbeddings
} from "./knowledge-embed"
import { getWorkspace } from "./workspace"
import { clearSourceContent, hashText, markDocumentReady, shouldSkipIndexedFile } from "./knowledge-index"

export { searchKnowledge } from "./knowledge-search"

const cancelled = new Set<string>()

export async function listKnowledgeSources(workspaceId: string) {
  const current = await resolveEmbeddingModelId()
  return listSources(getDatabase(), workspaceId).map((row) => {
    const models = listSourceEmbeddingModels(getDatabase(), row.id)
    return {
      ...row,
      embeddingModelId: models[0],
      embeddingsStale: embeddingsNeedRebuild(models, current)
    }
  })
}

export async function addKnowledgeSource(workspaceId: string, path: string) {
  const workspace = await getWorkspace(workspaceId)
  const resolved = resolveKnowledgePath(workspace.rootPath, path)
  const source = {
    id: createId("ks"),
    workspaceId,
    path: resolved.rel,
    kind: path.endsWith("/") || !(await isFile(resolved.abs)) ? "directory" : "file",
    status: "idle",
    documentCount: 0,
    chunkCount: 0,
    error: null,
    updatedAt: Date.now()
  }
  upsertSource(getDatabase(), source)
  return source
}

export async function indexKnowledgeSource(sourceId: string, rebuild = false) {
  const source = getSource(getDatabase(), sourceId)
  if (!source) throw new Error("Knowledge source not found.")
  cancelled.delete(sourceId)
  const workspace = await getWorkspace(source.workspaceId)
  upsertSource(getDatabase(), { ...source, status: "indexing", error: null, updatedAt: Date.now() })
  if (rebuild) clearSourceContent(source)
  const gitignore = await readGitignore(workspace.rootPath)
  const files = await collectFiles(workspace.rootPath, source.path, gitignore)
  for (const file of files) {
    if (cancelled.has(sourceId)) {
      upsertSource(getDatabase(), {
        ...source,
        ...tally(sourceId),
        status: "paused",
        updatedAt: Date.now()
      })
      return getSource(getDatabase(), sourceId)
    }
    if (!canParse(file)) continue
    try {
      const parsed = parseDocument(file, await readFile(file))
      if (!parsed.text) continue
      const rel = relative(workspace.rootPath, file).replace(/\\/g, "/")
      const hash = hashText(parsed.text)
      if (!rebuild && shouldSkipIndexedFile(sourceId, rel, hash)) continue
      await persistFileChunks(sourceId, rel, parsed.text)
      markDocumentReady(sourceId, rel, hash)
    } catch {
      // 单个文件失败不阻塞索引
    }
  }
  if (!cancelled.has(sourceId)) await reembedStaleSource(sourceId)
  upsertSource(getDatabase(), {
    ...source,
    ...tally(sourceId),
    status: "ready",
    error: null,
    updatedAt: Date.now()
  })
  return getSource(getDatabase(), sourceId)
}

export function cancelKnowledgeIndex(sourceId: string) {
  cancelled.add(sourceId)
  return { ok: true }
}

export function removeKnowledgeSource(sourceId: string) {
  deleteSource(getDatabase(), sourceId)
  return { ok: true }
}

function tally(sourceId: string) {
  return {
    documentCount: listDocuments(getDatabase(), sourceId).length,
    chunkCount: countSourceChunks(getDatabase(), sourceId)
  }
}

async function persistFileChunks(
  sourceId: string,
  rel: string,
  text: string
): Promise<number> {
  const parts = chunkText(rel, text)
  const documentId = `doc_${sourceId}_${rel}`.slice(0, 240)
  const db = getDatabase()
  for (const part of parts) {
    insertChunk(db, {
      id: part.id,
      documentId,
      sourceId,
      path: rel,
      startLine: part.startLine,
      endLine: part.endLine,
      text: part.text
    })
  }
  storeHashedEmbeddings(parts.map((part) => ({ id: part.id, text: part.text })))
  await tryProviderEmbeddings(parts.map((part) => ({ id: part.id, text: part.text })))
  return parts.length
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function readGitignore(root: string): Promise<string[]> {
  try {
    return parseGitignore(await readFile(join(root, ".gitignore"), "utf8"))
  } catch {
    return []
  }
}

async function collectFiles(root: string, rel: string, extra: string[]): Promise<string[]> {
  const start = resolveKnowledgePath(root, rel)
  const info = await stat(start.abs)
  if (info.isFile()) return shouldIgnore(start.rel, extra) ? [] : [start.abs]
  const out: string[] = []
  const entries = await readdir(start.abs, { withFileTypes: true })
  for (const entry of entries) {
    const prefix = start.rel === "." ? "" : `${start.rel.replace(/\/$/, "")}/`
    const childRel = `${prefix}${entry.name}`
    if (shouldIgnore(childRel, extra)) continue
    const child = resolveKnowledgePath(root, childRel)
    if (entry.isDirectory()) out.push(...(await collectFiles(root, child.rel, extra)))
    else out.push(child.abs)
  }
  return out
}
