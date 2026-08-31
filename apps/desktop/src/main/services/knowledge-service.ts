/**
 * Knowledge 索引与检索。用户显式选路径；遵守忽略规则；失败不阻塞。
 */
import { readFile, stat } from "node:fs/promises"
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
  collectKnowledgeFiles,
  embeddingsNeedRebuild,
  parseDocument,
  parseGitignore
} from "@enjoy-agents/knowledge"
import { getDatabase } from "./database"
import { createId } from "./ids"
import {
  reembedStaleSource,
  resolveEmbeddingModelId,
  storeHashedEmbeddings
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
  try {
    await stat(resolved.abs)
  } catch {
    throw new Error(`Path not found in workspace: ${resolved.rel} (under ${workspace.rootPath})`)
  }
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
  try {
    const gitignore = await readGitignore(workspace.rootPath)
    const files = await collectKnowledgeFiles(workspace.rootPath, source.path, gitignore)
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
        upsertSource(getDatabase(), {
          ...source,
          ...tally(sourceId),
          status: "indexing",
          updatedAt: Date.now()
        })
      } catch {
        // 单个文件失败不阻塞索引
      }
    }
    if (!cancelled.has(sourceId)) {
      try {
        await reembedStaleSource(sourceId)
      } catch {
        // 外部 embed 失败保持 hashed
      }
    }
    upsertSource(getDatabase(), {
      ...source,
      ...tally(sourceId),
      status: "ready",
      error: null,
      updatedAt: Date.now()
    })
    return getSource(getDatabase(), sourceId)
  } catch (err) {
    upsertSource(getDatabase(), {
      ...source,
      ...tally(sourceId),
      status: "error",
      error: String(err),
      updatedAt: Date.now()
    })
    throw err
  }
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

export async function listKnowledgeDocuments(workspaceId: string, sourceId?: string) {
  const db = getDatabase()
  const workspace = await getWorkspace(workspaceId)
  const gitignore = await readGitignore(workspace.rootPath)
  let sources = listSources(db, workspaceId)
  if (sourceId) {
    sources = sources.filter((s) => s.id === sourceId)
  }
  const result: Array<{
    id: string
    sourceId: string
    sourcePath: string
    path: string
    chunkCount: number
    status: string
    updatedAt: number
  }> = []

  const seenPaths = new Set<string>()

  for (const src of sources) {
    // 1. 已入库的文档
    const docs = listDocuments(db, src.id)
    for (const doc of docs) {
      seenPaths.add(doc.path)
      const row = db
        .prepare("SELECT COUNT(*) as n FROM knowledge_chunks WHERE document_id = ?")
        .get(doc.id) as { n: number } | undefined
      result.push({
        id: doc.id,
        sourceId: src.id,
        sourcePath: src.path,
        path: doc.path,
        chunkCount: row?.n || 0,
        status: doc.status,
        updatedAt: src.updatedAt
      })
    }

    // 2. 扫描真实磁盘文件，确保未完成或正在索引时也立即可见并支持预览
    try {
      const diskFiles = await collectKnowledgeFiles(workspace.rootPath, src.path, gitignore)
      for (const absFile of diskFiles) {
        if (!canParse(absFile)) continue
        const rel = relative(workspace.rootPath, absFile).replace(/\\/g, "/")
        if (!seenPaths.has(rel)) {
          seenPaths.add(rel)
          result.push({
            id: `doc_${src.id}_${rel}`,
            sourceId: src.id,
            sourcePath: src.path,
            path: rel,
            chunkCount: 0,
            status: src.status === "indexing" ? "indexing" : "unindexed",
            updatedAt: src.updatedAt
          })
        }
      }
    } catch {
      // 忽略扫描异常
    }
  }
  return result
}

