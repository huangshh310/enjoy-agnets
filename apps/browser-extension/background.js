/**
 * Enjoy Agents Browser Bridge — Background Service Worker
 * 维持与本地 Enjoy Agents IDE (127.0.0.1:47823) 的 WebSocket 链接，并执行智能体网页指令。
 */

let ws = null
let heartbeatTimer = null
let currentPairingCode = ""

function parsePairingCode(code) {
  // 格式: enjoy-bridge:47823:<token>
  const parts = code.trim().split(":")
  if (parts.length < 3) return null
  const port = parseInt(parts[1], 10) || 47823
  const token = parts[2]
  return { port, token }
}

function connect(pairingCode) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    ws.close()
  }

  const parsed = parsePairingCode(pairingCode)
  if (!parsed) {
    console.error("Invalid pairing code format")
    return
  }

  currentPairingCode = pairingCode
  const wsUrl = `ws://127.0.0.1:${parsed.port}/?token=${parsed.token}`

  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log("Connected to Enjoy Agents IDE Bridge")
      chrome.storage.local.set({ connected: true })
      startHeartbeat()
      const manifest = chrome.runtime.getManifest()
      ws.send(JSON.stringify({
        type: "client_info",
        browser: "Chrome",
        version: manifest.version || "0.1.0"
      }))
    }

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        await handleBridgeMessage(message)
      } catch (err) {
        console.error("Failed to parse message", err)
      }
    }

    ws.onclose = () => {
      console.log("Disconnected from Enjoy Agents IDE Bridge")
      chrome.storage.local.set({ connected: false })
      stopHeartbeat()
    }

    ws.onerror = (err) => {
      console.error("WebSocket error", err)
      chrome.storage.local.set({ connected: false })
    }
  } catch (err) {
    console.error("Connection failed", err)
    chrome.storage.local.set({ connected: false })
  }
}

function disconnect() {
  stopHeartbeat()
  if (ws) {
    ws.close()
    ws = null
  }
  chrome.storage.local.set({ connected: false })
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }))
    }
  }, 15000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

async function handleBridgeMessage(msg) {
  const { id, action, params } = msg

  try {
    let result = null

    if (action === "navigate") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab && tab.id) {
        await chrome.tabs.update(tab.id, { url: params.url })
        result = { url: params.url, status: "navigating" }
      } else {
        const newTab = await chrome.tabs.create({ url: params.url })
        result = { url: params.url, tabId: newTab.id, status: "created" }
      }
    } else if (action === "extract_content") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab || !tab.id) {
        throw new Error("No active tab found")
      }
      const [{ result: content }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          title: document.title,
          url: window.location.href,
          text: document.body.innerText.slice(0, 10000)
        })
      })
      result = content
    } else if (action === "screenshot") {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" })
      result = { dataUrl }
    }

    if (id && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id, success: true, result }))
    }
  } catch (err) {
    if (id && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id, success: false, error: err.message }))
    }
  }
}

// 接收来自 popup 的连接控制指令
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === "connect") {
    connect(req.pairingCode)
    sendResponse({ success: true })
  } else if (req.action === "disconnect") {
    disconnect()
    sendResponse({ success: true })
  }
})

// 扩展启动时自动恢复已保存的配对
chrome.storage.local.get(["pairingCode", "connected"], (res) => {
  if (res.connected && res.pairingCode) {
    connect(res.pairingCode)
  }
})
