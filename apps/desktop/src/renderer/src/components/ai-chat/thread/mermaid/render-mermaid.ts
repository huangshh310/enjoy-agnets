/**
 * 原生 Mermaid 渲染管道：动态 import()，适配 BoardUI 亮暗主题，失败抛出以便回退代码块。
 */
export async function renderMermaidSvg(code: string): Promise<string> {
  const mermaid = (await import("mermaid")).default

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")

  // 每次按当前主题配置初始化
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: isDark ? "dark" : "neutral",
    fontFamily: "var(--font-inter, sans-serif)",
    themeVariables: {
      darkMode: isDark,
      background: isDark ? "#18181b" : "#ffffff",
      primaryColor: isDark ? "#27272a" : "#f4f4f5",
      primaryTextColor: isDark ? "#f4f4f5" : "#09090b",
      primaryBorderColor: isDark ? "#3f3f46" : "#e4e4e7",
      lineColor: isDark ? "#71717a" : "#a1a1aa",
      secondaryColor: isDark ? "#27272a" : "#f4f4f5",
      tertiaryColor: isDark ? "#18181b" : "#ffffff",
      mainBkg: isDark ? "#27272a" : "#f4f4f5",
      nodeBorder: isDark ? "#3f3f46" : "#e4e4e7",
      textColor: isDark ? "#f4f4f5" : "#09090b"
    }
  })

  const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
  const { svg } = await mermaid.render(id, code)
  return svg
}
