/**
 * Computer Use Overlay Preload Script:
 * 安全将主进程的 overlay:action 事件通过 CustomEvent 桥接至轻量动效网页。
 */
const { ipcRenderer } = require("electron")

window.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.on("overlay:action", (_event, payload) => {
    window.dispatchEvent(new CustomEvent("computer-use-action", { detail: payload }))
  })
})
