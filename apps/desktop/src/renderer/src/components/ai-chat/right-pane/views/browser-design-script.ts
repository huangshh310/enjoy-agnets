/**
 * 注入预览 webview：点元素后返回 HTML/CSS 摘要。
 */
export const BROWSER_DESIGN_SCRIPT = `
(() => new Promise((resolve) => {
  const prev = document.getElementById("enjoy-design-mode-style")
  if (prev) prev.remove()
  const style = document.createElement("style")
  style.id = "enjoy-design-mode-style"
  style.textContent = "*:hover{outline:2px solid #3b82f6 !important;outline-offset:1px;}"
  document.head.appendChild(style)
  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const el = event.target
    if (!(el instanceof Element)) return
    document.removeEventListener("click", onClick, true)
    style.remove()
    const cs = window.getComputedStyle(el)
    resolve({
      tag: el.tagName.toLowerCase(),
      html: (el.outerHTML || "").slice(0, 4000),
      text: (el.textContent || "").trim().slice(0, 400),
      css: ["color","backgroundColor","fontSize","fontFamily","display","width","height"]
        .map((key) => key + ":" + cs[key])
        .join("; ")
    })
  }
  document.addEventListener("click", onClick, true)
}))()
`
