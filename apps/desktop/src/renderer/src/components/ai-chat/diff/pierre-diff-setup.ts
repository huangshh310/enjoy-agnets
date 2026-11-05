/**
 * @pierre/diffs × 仓内 shiki 4.4.x 单线：
 * - preferredHighlighter 钉 shiki-js（Electron CSP 无 wasm-unsafe-eval）
 * - 主题名 css-variables · variablePrefix --shiki- · 与 use-shiki-html / SHIKI_TOKEN_VARS 同源
 * - 增减色不进 token 字色；由 host CSS 变量覆盖 pierre 行底/边条
 */
import type { CSSProperties } from "react"
import {
  createCSSVariablesTheme,
  registerCustomTheme
} from "@pierre/diffs"
import type { FileDiffOptions } from "@pierre/diffs/react"
import type { DiffPalette } from "./diff-palette"

export const PIERRE_DIFF_THEME = "css-variables"

const ENJOY_CSS_VARIABLES_THEME = createCSSVariablesTheme({
  name: PIERRE_DIFF_THEME,
  variablePrefix: "--shiki-",
  fontStyle: true
})

let themeRegistered = false

/** 模块级只注册一次；同名已注册时 pierre 会 console.error 并跳过。 */
export function ensurePierreDiffTheme(): void {
  if (themeRegistered) return
  themeRegistered = true
  registerCustomTheme(PIERRE_DIFF_THEME, () => Promise.resolve(ENJOY_CSS_VARIABLES_THEME), "diffs")
}

ensurePierreDiffTheme()

/** Review / 对话浅底：语法 token 走 SHIKI_TOKEN_VARS；增减走 diff-palette 覆盖。 */
export function pierreDiffHostStyle(palette: DiffPalette): CSSProperties {
  const add =
    palette === "distinct"
      ? "var(--color-accent-500)"
      : "var(--color-state-success-base)"
  const del =
    palette === "distinct"
      ? "var(--color-status-yellow-text)"
      : "var(--color-background-tertiary-error)"
  const addBg =
    palette === "distinct"
      ? "color-mix(in oklab, var(--color-accent-500) 10%, transparent)"
      : "color-mix(in oklab, var(--color-state-success-text) 10%, transparent)"
  const delBg =
    palette === "distinct"
      ? "color-mix(in oklab, var(--color-status-yellow-background) 40%, transparent)"
      : "color-mix(in oklab, var(--color-background-tertiary-error) 10%, transparent)"
  return {
    // pierre :host 继承这些变量 → 行底 / 边条；禁写进 shiki token 字色
    ["--diffs-addition-color-override" as string]: add,
    ["--diffs-deletion-color-override" as string]: del,
    ["--diffs-bg-addition-override" as string]: addBg,
    ["--diffs-bg-deletion-override" as string]: delBg,
    ["--diffs-bg" as string]: "transparent",
    ["--diffs-light-bg" as string]: "transparent",
    ["--diffs-dark-bg" as string]: "transparent",
    ["--diffs-font-size" as string]: "12px",
    ["--diffs-line-height" as string]: "1.625"
  }
}

export function buildPierreDiffOptions(input: {
  wordWrap?: boolean
  wordDiff?: boolean
}): FileDiffOptions<undefined, undefined> {
  return {
    theme: {
      light: PIERRE_DIFF_THEME,
      dark: PIERRE_DIFF_THEME
    },
    themeType: "light",
    preferredHighlighter: "shiki-js",
    diffStyle: "unified",
    diffIndicators: "bars",
    disableFileHeader: true,
    disableBackground: false,
    overflow: input.wordWrap ? "wrap" : "scroll",
    lineDiffType: input.wordDiff ? "word" : "none",
    // 大文件折叠由 applyDiffViewOptions 预滤；勿用 pierre 上下文折叠冒充
    expandUnchanged: false,
    hunkSeparators: "metadata",
    stickyHeader: false
  }
}
