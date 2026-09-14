const pairingInput = document.getElementById("pairingCode")
const connectBtn = document.getElementById("connectBtn")
const disconnectBtn = document.getElementById("disconnectBtn")
const statusPill = document.getElementById("statusPill")
const statusText = document.getElementById("statusText")

function updateUI(connected) {
  if (connected) {
    statusPill.classList.add("connected")
    statusText.textContent = "已连接"
    connectBtn.style.display = "none"
    disconnectBtn.style.display = "block"
    pairingInput.disabled = true
  } else {
    statusPill.classList.remove("connected")
    statusText.textContent = "未连接"
    connectBtn.style.display = "block"
    disconnectBtn.style.display = "none"
    pairingInput.disabled = false
  }
}

// 载入保存的配对码与连接状态
chrome.storage.local.get(["pairingCode", "connected"], (res) => {
  if (res.pairingCode) {
    pairingInput.value = res.pairingCode
  }
  updateUI(Boolean(res.connected))
})

connectBtn.addEventListener("click", () => {
  const code = pairingInput.value.trim()
  if (!code) return
  chrome.storage.local.set({ pairingCode: code }, () => {
    chrome.runtime.sendMessage({ action: "connect", pairingCode: code }, (res) => {
      updateUI(res && res.success)
    })
  })
})

disconnectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "disconnect" }, () => {
    chrome.storage.local.set({ connected: false }, () => {
      updateUI(false)
    })
  })
})
