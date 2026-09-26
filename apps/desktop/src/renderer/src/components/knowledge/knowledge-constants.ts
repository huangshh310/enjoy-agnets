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
      bg: "bg-accent-500/10",
      border: "border-accent-500/25 hover:border-accent-500/50",
      text: "text-accent-500",
      folderColor: "from-accent-500 to-accent-500",
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
      bg: "bg-chart-5/10",
      border: "border-chart-5/25 hover:border-chart-5/50",
      text: "text-chart-5",
      folderColor: "from-chart-5 to-chart-5",
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
      bg: "bg-state-success-text/10",
      border: "border-state-success-text/25 hover:border-state-success-text/50",
      text: "text-state-success-text",
      folderColor: "from-state-success-text to-chart-1",
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
      bg: "bg-status-yellow-background/10",
      border: "border-status-yellow-text/25 hover:border-status-yellow-text/50",
      text: "text-status-yellow-text",
      folderColor: "from-status-yellow-text to-status-yellow-text",
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
  { ext: ".pptx", labelKey: "pages.knowledge.formatPptx", color: "text-status-yellow-text bg-status-yellow-background/10 border-status-yellow-text/20" },
  { ext: ".ppt", labelKey: "pages.knowledge.formatPpt", color: "text-status-yellow-text bg-status-yellow-background/10 border-status-yellow-text/20" },
  { ext: ".docx", labelKey: "pages.knowledge.formatDocx", color: "text-accent-500 bg-accent-500/10 border-accent-500/20" },
  { ext: ".doc", labelKey: "pages.knowledge.formatDoc", color: "text-accent-500 bg-accent-500/10 border-accent-500/20" },
  { ext: ".xlsx", labelKey: "pages.knowledge.formatXlsx", color: "text-state-success-text bg-state-success-text/10 border-state-success-text/20" },
  { ext: ".pdf", labelKey: "pages.knowledge.formatPdf", color: "text-text-error-primary bg-background-tertiary-error/10 border-border-error-default/20" },
  { ext: ".csv", labelKey: "pages.knowledge.formatCsv", color: "text-chart-1 bg-chart-1/10 border-chart-1/20" },
  { ext: ".md", labelKey: "pages.knowledge.formatMd", color: "text-accent-500 bg-accent-500/10 border-accent-500/20" },
  { ext: ".ts", labelKey: "pages.knowledge.formatTs", color: "text-accent-500 bg-accent-500/10 border-accent-500/20" },
  { ext: ".tsx", labelKey: "pages.knowledge.formatTsx", color: "text-chart-1 bg-chart-1/10 border-chart-1/20" },
  { ext: ".js", labelKey: "pages.knowledge.formatJs", color: "text-status-yellow-text bg-status-yellow-background/10 border-status-yellow-text/20" },
  { ext: ".py", labelKey: "pages.knowledge.formatPy", color: "text-state-success-text bg-state-success-text/10 border-state-success-text/20" },
  { ext: ".json", labelKey: "pages.knowledge.formatJson", color: "text-chart-5 bg-chart-5/10 border-chart-5/20" },
  { ext: ".yaml", labelKey: "pages.knowledge.formatYaml", color: "text-status-yellow-text bg-status-yellow-background/10 border-status-yellow-text/20" },
  { ext: ".sql", labelKey: "pages.knowledge.formatSql", color: "text-text-error-primary bg-background-tertiary-error/10 border-border-error-default/20" },
  { ext: ".txt", labelKey: "pages.knowledge.formatTxt", color: "text-text-secondary bg-background-secondary-default/10 border-separator-border/20" }
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
