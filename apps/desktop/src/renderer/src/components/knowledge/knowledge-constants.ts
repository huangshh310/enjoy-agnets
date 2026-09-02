/**
 * 知识预设、格式标签与示例查询。文案走 i18n。
 */
import {
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiFolder6Line,
  RiFolderLine,
  RiSparklingLine
} from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"

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

const PRESET_DEFS: Array<
  Omit<KnowledgePresetFolder, "name" | "category" | "description"> & {
    nameKey: string
    categoryKey: string
    descKey: string
  }
> = [
  {
    id: "root",
    path: ".",
    nameKey: "pages.knowledge.presetRootName",
    categoryKey: "pages.knowledge.presetRootCategory",
    descKey: "pages.knowledge.presetRootDesc",
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
    path: "src",
    nameKey: "pages.knowledge.presetSrcName",
    categoryKey: "pages.knowledge.presetSrcCategory",
    descKey: "pages.knowledge.presetSrcDesc",
    icon: RiCodeSSlashLine,
    colorTheme: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/25 hover:border-purple-500/50",
      text: "text-purple-500",
      folderColor: "from-purple-600 to-violet-700",
      glow: "rgba(168, 85, 247, 0.15)"
    }
  },
  {
    id: "docs",
    path: "docs",
    nameKey: "pages.knowledge.presetDocsName",
    categoryKey: "pages.knowledge.presetDocsCategory",
    descKey: "pages.knowledge.presetDocsDesc",
    icon: RiBookOpenLine,
    colorTheme: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25 hover:border-emerald-500/50",
      text: "text-emerald-500",
      folderColor: "from-emerald-600 to-teal-700",
      glow: "rgba(16, 185, 129, 0.15)"
    }
  },
  {
    id: "design",
    path: "design",
    nameKey: "pages.knowledge.presetDesignName",
    categoryKey: "pages.knowledge.presetDesignCategory",
    descKey: "pages.knowledge.presetDesignDesc",
    icon: RiSparklingLine,
    colorTheme: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/25 hover:border-amber-500/50",
      text: "text-amber-500",
      folderColor: "from-amber-500 to-orange-600",
      glow: "rgba(245, 158, 11, 0.15)"
    }
  }
]

export function getKnowledgePresetFolders(t: TranslateFn): KnowledgePresetFolder[] {
  return PRESET_DEFS.map((preset) => ({
    id: preset.id,
    path: preset.path,
    name: t(preset.nameKey),
    category: t(preset.categoryKey),
    description: t(preset.descKey),
    icon: preset.icon,
    colorTheme: preset.colorTheme,
    isRecommended: preset.isRecommended
  }))
}

const FORMAT_DEFS = [
  { ext: ".pptx", labelKey: "pages.knowledge.formatPptx", color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  { ext: ".ppt", labelKey: "pages.knowledge.formatPpt", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { ext: ".docx", labelKey: "pages.knowledge.formatDocx", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { ext: ".doc", labelKey: "pages.knowledge.formatDoc", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { ext: ".xlsx", labelKey: "pages.knowledge.formatXlsx", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { ext: ".pdf", labelKey: "pages.knowledge.formatPdf", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { ext: ".csv", labelKey: "pages.knowledge.formatCsv", color: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
  { ext: ".md", labelKey: "pages.knowledge.formatMd", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { ext: ".ts", labelKey: "pages.knowledge.formatTs", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { ext: ".tsx", labelKey: "pages.knowledge.formatTsx", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { ext: ".js", labelKey: "pages.knowledge.formatJs", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { ext: ".py", labelKey: "pages.knowledge.formatPy", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { ext: ".json", labelKey: "pages.knowledge.formatJson", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { ext: ".yaml", labelKey: "pages.knowledge.formatYaml", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { ext: ".sql", labelKey: "pages.knowledge.formatSql", color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { ext: ".txt", labelKey: "pages.knowledge.formatTxt", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" }
] as const

export function getSupportedFileFormats(t: TranslateFn) {
  return FORMAT_DEFS.map((format) => ({
    ext: format.ext,
    label: t(format.labelKey),
    color: format.color
  }))
}

export function getSampleQueries(t: TranslateFn): string[] {
  return [
    t("pages.knowledge.sampleArchitecture"),
    t("pages.knowledge.sampleTheme"),
    t("pages.knowledge.sampleAgentLoop"),
    t("pages.knowledge.sampleApi"),
    t("pages.knowledge.sampleSecurity")
  ]
}
