/**
 * @ 文件索引与 / 技能目录。技能在各引擎都拉；ACP 斜杠命令仍只进 ⌘L。
 */
import { useEffect, useState } from "react"
import type { SkillItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import type { KnowledgeDocumentItem } from "@enjoy-agents/ipc-contract"
import { collectMentionFiles, type MentionDirEntry } from "./collect-mention-files.ts"
import type { MentionDoc } from "./build-mention-items.ts"
import { mentionDocsFromKnowledge } from "./mention-docs.ts"
import { rememberSkillCatalog } from "./composer-skill-chips.ts"
import { sortEntries } from "../../right-pane/views/files-entries.ts"

async function listDir(workspaceId: string, path: string): Promise<MentionDirEntry[]> {
  const rows = (await getIde().workspace.files({ workspaceId, path })) as MentionDirEntry[]
  return sortEntries(rows)
}

export function useMentionSources(workspaceId: string | null, loadSkills: boolean) {
  const [roots, setRoots] = useState<MentionDirEntry[]>([])
  const [files, setFiles] = useState<MentionDirEntry[]>([])
  const [docs, setDocs] = useState<MentionDoc[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!workspaceId || !hasIde()) {
      setRoots([])
      setFiles([])
      setDocs([])
      setReady(true)
      return
    }
    let cancelled = false
    setReady(false)
    void listDir(workspaceId, ".")
      .then((rows) => {
        if (!cancelled) setRoots(rows)
        return collectMentionFiles((path) => listDir(workspaceId, path))
      })
      .then((rows) => {
        if (!cancelled) setFiles(rows)
      })
      .catch(() => {
        if (!cancelled) {
          setRoots([])
          setFiles([])
          setDocs([])
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  useEffect(() => {
    if (!loadSkills || !hasIde()) {
      rememberSkillCatalog([])
      return
    }
    let cancelled = false
    void loadSkillCatalog().then((ok) => {
      if (cancelled || !ok) rememberSkillCatalog([])
    })
    return () => {
      cancelled = true
    }
  }, [loadSkills, workspaceId])

  useEffect(() => {
    if (!workspaceId || !hasIde()) {
      setDocs([])
      return
    }
    let cancelled = false
    void getIde()
      .knowledge.documents({ workspaceId })
      .then((rows) => {
        if (!cancelled) setDocs(mentionDocsFromKnowledge(rows as KnowledgeDocumentItem[]))
      })
      .catch(() => {
        if (!cancelled) setDocs([])
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  return { roots, files, docs, ready }
}

async function loadSkillCatalog() {
  const store = useChatStore.getState()
  const workspaces = (await getIde().workspace.list()) as Array<{ id: string; rootPath?: string }>
  const root = workspaces.find((row) => row.id === store.workspaceId)?.rootPath
  const skills = (await getIde().skills.list(root ? { workspacePath: root } : {})) as SkillItem[]
  rememberSkillCatalog(skills, root)
  return true
}
