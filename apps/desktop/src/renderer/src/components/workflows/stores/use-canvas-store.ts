/**
 * 画布项目本地持久化，对齐 infinite-canvas use-canvas-store。
 */
import { create } from "zustand"
import { STORE_KEY } from "../lib/canvas-constants"
import type { CanvasBackgroundMode } from "../lib/canvas-theme"
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ViewportTransform } from "../lib/canvas.types"

export type CanvasProject = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  nodes: CanvasNodeData[]
  connections: CanvasConnection[]
  chatSessions: CanvasAssistantSession[]
  activeChatId: string | null
  backgroundMode: CanvasBackgroundMode
  showImageInfo: boolean
  viewport: ViewportTransform
}

type CanvasStore = {
  projects: CanvasProject[]
  createProject: (title?: string) => string
  openProject: (id: string) => CanvasProject | null
  renameProject: (id: string, title: string) => void
  deleteProjects: (ids: string[]) => void
  updateProject: (
    id: string,
    patch: Partial<Pick<CanvasProject, "nodes" | "connections" | "viewport" | "backgroundMode" | "showImageInfo" | "title">>
  ) => void
}

const initialViewport: ViewportTransform = { x: 80, y: 80, k: 1 }

function loadProjects(): CanvasProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { projects?: CanvasProject[] }
    return Array.isArray(parsed.projects) ? parsed.projects : []
  } catch {
    return []
  }
}

function persist(projects: CanvasProject[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ projects }))
  } catch {
    // ignore quota
  }
}

function nowIso() {
  return new Date().toISOString()
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  projects: loadProjects(),
  createProject: (title = "Untitled") => {
    const id = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const project: CanvasProject = {
      id,
      title,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      nodes: [],
      connections: [],
      chatSessions: [],
      activeChatId: null,
      backgroundMode: "lines",
      showImageInfo: false,
      viewport: { ...initialViewport }
    }
    const projects = [project, ...get().projects]
    persist(projects)
    set({ projects })
    return id
  },
  openProject: (id) => get().projects.find((item) => item.id === id) ?? null,
  renameProject: (id, title) => {
    const projects = get().projects.map((item) =>
      item.id === id ? { ...item, title: title.trim() || item.title, updatedAt: nowIso() } : item
    )
    persist(projects)
    set({ projects })
  },
  deleteProjects: (ids) => {
    const removing = new Set(ids)
    const projects = get().projects.filter((item) => !removing.has(item.id))
    persist(projects)
    set({ projects })
  },
  updateProject: (id, patch) => {
    const projects = get().projects.map((item) =>
      item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item
    )
    persist(projects)
    set({ projects })
  }
}))
