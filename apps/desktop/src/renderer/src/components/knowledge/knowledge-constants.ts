import {
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiFolder6Line,
  RiFolderLine,
  RiSparklingLine
} from "@remixicon/react"

export interface KnowledgePresetFolder {
  id: string
  name: string
  path: string
  category: string
  description: string
  icon: typeof RiFolderLine
  colorTheme: {
    bg: string
    border: string
    text: string
    folderColor: string
    glow: string
  }
  isRecommended?: boolean
}

export const KNOWLEDGE_PRESET_FOLDERS: KnowledgePresetFolder[] = [
  {
    id: "root",
    name: "Workspace Root",
    path: ".",
    category: "General Knowledge",
    description: "Index all documentation, configs, and primary codebases across the repository.",
    icon: RiFolder6Line,
    colorTheme: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/25 hover:border-blue-500/50",
      text: "text-blue-500",
      folderColor: "from-blue-600 to-indigo-600",
      glow: "rgba(59, 130, 246, 0.15)"
    },
    isRecommended: true
  },
  {
    id: "src",
    name: "Source Code (src/)",
    path: "src",
    category: "Code & Components",
    description: "Focus indexing on core algorithms, UI components, utilities, and business logic.",
    icon: RiCodeSSlashLine,
    colorTheme: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/25 hover:border-purple-500/50",
      text: "text-purple-500",
      folderColor: "from-purple-600 to-violet-700",
      glow: "rgba(168, 85, 247, 0.15)"
    },
  },
  {
    id: "docs",
    name: "Docs & Specs (docs/)",
    path: "docs",
    category: "Documentation",
    description: "Index product specs, architecture contracts, API guides, and team conventions.",
    icon: RiBookOpenLine,
    colorTheme: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25 hover:border-emerald-500/50",
      text: "text-emerald-500",
      folderColor: "from-emerald-600 to-teal-700",
      glow: "rgba(16, 185, 129, 0.15)"
    },
  },
  {
    id: "design",
    name: "Architecture & Design",
    path: "design",
    category: "Design System",
    description: "Index UI tokens, visual design specifications, component guidelines, and design RFCs.",
    icon: RiSparklingLine,
    colorTheme: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/25 hover:border-amber-500/50",
      text: "text-amber-500",
      folderColor: "from-amber-500 to-orange-600",
      glow: "rgba(245, 158, 11, 0.15)"
    },
  }
]

export const SUPPORTED_FILE_FORMATS = [
  { ext: ".pptx", label: "PowerPoint", color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  { ext: ".ppt", label: "PPT Slide", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { ext: ".docx", label: "Word Doc", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { ext: ".doc", label: "Word Legacy", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { ext: ".xlsx", label: "Excel Sheet", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { ext: ".pdf", label: "PDF Document", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { ext: ".csv", label: "CSV Table", color: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
  { ext: ".md", label: "Markdown", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { ext: ".ts", label: "TypeScript", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { ext: ".tsx", label: "React TSX", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { ext: ".js", label: "JavaScript", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { ext: ".py", label: "Python", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { ext: ".json", label: "JSON Data", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { ext: ".yaml", label: "YAML Config", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { ext: ".sql", label: "SQL Query", color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { ext: ".txt", label: "Plain Text", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" }
]

export const SAMPLE_QUERIES = [
  "Architecture and IPC channels",
  "Theme tokens and visual styling",
  "Agent tool execution loop",
  "API specs and data schemas",
  "Security boundary and safeStorage"
]
