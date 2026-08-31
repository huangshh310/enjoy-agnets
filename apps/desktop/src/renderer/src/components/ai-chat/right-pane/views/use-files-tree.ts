/**
 * 目录树状态：根列表、打开集合、按需加载子目录。
 */
import { useEffect, useMemo, useState } from "react"
import { getIde } from "@renderer/lib/ide"
import { expandDirectories, sortEntries, type DirEntry } from "./files-entries"

async function listEntries(workspaceId: string, path: string): Promise<DirEntry[]> {
  const rows = (await getIde().workspace.files({ workspaceId, path })) as DirEntry[]
  return sortEntries(rows)
}

export function useFilesTree(workspaceId: string) {
  const [query, setQuery] = useState("")
  const [roots, setRoots] = useState<DirEntry[]>([])
  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set())
  const [childrenByPath, setChildrenByPath] = useState<Record<string, DirEntry[]>>({})

  useEffect(() => {
    let cancelled = false
    void listEntries(workspaceId, ".")
      .then((rows) => {
        if (cancelled) return
        setRoots(rows)
        setOpenPaths(new Set())
        setChildrenByPath({})
      })
      .catch(() => {
        if (!cancelled) setRoots([])
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return roots
    return roots.filter((entry) => entry.name.toLowerCase().includes(needle))
  }, [query, roots])

  async function toggleDir(path: string) {
    const nextOpen = new Set(openPaths)
    if (nextOpen.has(path)) {
      nextOpen.delete(path)
      setOpenPaths(nextOpen)
      return
    }
    nextOpen.add(path)
    setOpenPaths(nextOpen)
    if (childrenByPath[path]) return
    const rows = await listEntries(workspaceId, path)
    setChildrenByPath((prev) => ({ ...prev, [path]: rows }))
  }

  async function expandAll() {
    const next = await expandDirectories(roots, childrenByPath, (path) =>
      listEntries(workspaceId, path)
    )
    setOpenPaths(next.open)
    setChildrenByPath(next.children)
  }

  return {
    query,
    setQuery,
    visible,
    openPaths,
    childrenByPath,
    toggleDir,
    expandAll,
    collapseAll: () => setOpenPaths(new Set())
  }
}
