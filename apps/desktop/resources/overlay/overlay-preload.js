/**
 * Overlay 窗 preload：主进程铬事件 ↔ HTML；停止 / 鼠标穿透不进 renderer 合约。
 */
const { ipcRenderer } = require("electron")

window.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.on("overlay:chrome", (_event, payload) => {
    window.dispatchEvent(new CustomEvent("overlay-chrome", { detail: payload }))
  })
  window.addEventListener("overlay-stop", () => {
    ipcRenderer.send("overlay:stop")
  })
  window.addEventListener("overlay-ignore-mouse", (event) => {
    ipcRenderer.send("overlay:ignore-mouse", event.detail !== false)
  })
})
