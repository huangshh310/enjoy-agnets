/**
 * 按文件名 / 扩展名解析图标种类。色只用 BoardUI 语义 token。
 */
import { extensionOf } from "../../../lib/file-name.ts"

export type FileTone =
  | "text-accent-500"
  | "text-docs-command-accent"
  | "text-state-success-text"
  | "text-text-error-primary"
  | "text-chart-1"
  | "text-chart-2"
  | "text-chart-3"
  | "text-text-tertiary"

export type FileGlyph = {
  mark: string
  tone: FileTone
}

const TONE = {
  accent: "text-accent-500",
  command: "text-docs-command-accent",
  success: "text-state-success-text",
  danger: "text-text-error-primary",
  chart1: "text-chart-1",
  chart2: "text-chart-2",
  chart3: "text-chart-3",
  muted: "text-text-tertiary"
} as const satisfies Record<string, FileTone>

const SPECIAL_NAMES: Record<string, FileGlyph> = {
  "package.json": { mark: "npm", tone: TONE.danger },
  "package-lock.json": { mark: "npm", tone: TONE.danger },
  "pnpm-lock.yaml": { mark: "pnpm", tone: TONE.accent },
  "tsconfig.json": { mark: "TS", tone: TONE.command },
  "jsconfig.json": { mark: "JS", tone: TONE.chart2 },
  dockerfile: { mark: "dk", tone: TONE.command },
  "docker-compose.yml": { mark: "dk", tone: TONE.command },
  "docker-compose.yaml": { mark: "dk", tone: TONE.command },
  ".gitignore": { mark: "git", tone: TONE.accent },
  ".gitattributes": { mark: "git", tone: TONE.accent },
  ".env": { mark: "env", tone: TONE.success },
  ".env.local": { mark: "env", tone: TONE.success },
  "readme.md": { mark: "MD", tone: TONE.command }
}

const EXTENSIONS: Record<string, FileGlyph> = {
  html: { mark: "<>", tone: TONE.accent },
  htm: { mark: "<>", tone: TONE.accent },
  css: { mark: "#", tone: TONE.command },
  scss: { mark: "#", tone: TONE.chart3 },
  less: { mark: "#", tone: TONE.chart3 },
  js: { mark: "JS", tone: TONE.chart2 },
  mjs: { mark: "JS", tone: TONE.chart2 },
  cjs: { mark: "JS", tone: TONE.chart2 },
  jsx: { mark: "JX", tone: TONE.chart1 },
  ts: { mark: "TS", tone: TONE.command },
  mts: { mark: "TS", tone: TONE.command },
  cts: { mark: "TS", tone: TONE.command },
  "d.ts": { mark: "TS", tone: TONE.command },
  tsx: { mark: "TX", tone: TONE.chart1 },
  json: { mark: "{}", tone: TONE.chart2 },
  md: { mark: "MD", tone: TONE.command },
  mdx: { mark: "MD", tone: TONE.command },
  svg: { mark: "svg", tone: TONE.accent },
  png: { mark: "img", tone: TONE.chart3 },
  jpg: { mark: "img", tone: TONE.chart3 },
  jpeg: { mark: "img", tone: TONE.chart3 },
  gif: { mark: "img", tone: TONE.chart3 },
  webp: { mark: "img", tone: TONE.chart3 },
  ico: { mark: "img", tone: TONE.chart3 },
  yml: { mark: "Y", tone: TONE.chart3 },
  yaml: { mark: "Y", tone: TONE.chart3 },
  toml: { mark: "T", tone: TONE.muted },
  xml: { mark: "xml", tone: TONE.accent },
  py: { mark: "PY", tone: TONE.command },
  go: { mark: "GO", tone: TONE.chart1 },
  rs: { mark: "RS", tone: TONE.accent },
  sh: { mark: "sh", tone: TONE.success },
  bash: { mark: "sh", tone: TONE.success },
  ps1: { mark: "ps", tone: TONE.command },
  bat: { mark: "bat", tone: TONE.muted },
  sql: { mark: "sql", tone: TONE.accent },
  vue: { mark: "V", tone: TONE.success },
  svelte: { mark: "S", tone: TONE.accent },
  zip: { mark: "zip", tone: TONE.accent },
  gz: { mark: "zip", tone: TONE.accent },
  pdf: { mark: "pdf", tone: TONE.danger },
  txt: { mark: "txt", tone: TONE.muted }
}

const DEFAULT_FILE: FileGlyph = { mark: "f", tone: TONE.muted }

/** 目录用文件夹标；文件先看特殊文件名，再看扩展名。 */
export function fileGlyphFor(name: string, kind: "file" | "directory"): FileGlyph | "folder" {
  if (kind === "directory") return "folder"
  const lower = name.toLowerCase()
  if (SPECIAL_NAMES[lower]) return SPECIAL_NAMES[lower]!
  const ext = extensionOf(lower)
  return (ext && EXTENSIONS[ext]) || DEFAULT_FILE
}
