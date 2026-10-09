/// AppSnap：截最前或点选的窗口。不点击、不注册桌面工具。
import AppKit
import CoreGraphics
import Foundation
import ScreenCaptureKit

let pngLimit = 8 * 1024 * 1024

if CommandLine.arguments.dropFirst().first == "watch" {
  watch(Array(CommandLine.arguments.dropFirst(2)))
}

// 读 stdin 放后台，主线程必须停在 dispatchMain。否则顶层语句结束进程就退出，
// ScreenCaptureKit 的主队列回调也没处跑。stdin 关闭后再退出，避免父进程关掉管道后残留。
_ = NSApplication.shared
let queue = DispatchQueue(label: "enjoy.appsnap.rpc")
queue.async {
  while let line = readLine(strippingNewline: true) {
    guard let data = line.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = obj["id"] as? String,
          let method = obj["method"] as? String else { continue }
    let params = obj["params"] as? [String: Any] ?? [:]
    let sem = DispatchSemaphore(value: 0)
    Task {
      await dispatch(id: id, method: method, params: params)
      sem.signal()
    }
    sem.wait()
  }
  exit(0)
}
dispatchMain()

func dispatch(id: String, method: String, params: [String: Any]) async {
  switch method {
  case "doctor":
    emit(["id": id, "result": [
      "screenCapture": CGPreflightScreenCaptureAccess(),
      "inputMonitoring": CGPreflightListenEventAccess(),
      "executablePath": CommandLine.arguments[0]
    ]])
  case "list_windows":
    await listWindows(id: id)
  case "capture":
    await capture(id: id, params: params)
  default:
    fail(id, "unknown_method", method)
  }
}

func listWindows(id: String) async {
  guard #available(macOS 14.0, *) else {
    fail(id, "unsupported", "macos")
    return
  }
  do {
    let rows = try await withTimeout(6) { try await shareableRows() }
    emit(["id": id, "result": ["windows": rows]])
  } catch {
    fail(id, "capture_failed", String(describing: error))
  }
}

func capture(id: String, params: [String: Any]) async {
  guard #available(macOS 14.0, *) else {
    fail(id, "unsupported", "macos")
    return
  }
  do {
    let png = try await withTimeout(6) { try await pngOf(windowId: intValue(params["windowId"])) }
    if png.count > pngLimit {
      fail(id, "too_large", "png")
      return
    }
    emit(["id": id, "result": ["pngBase64": png.base64EncodedString()]])
  } catch {
    fail(id, "capture_failed", String(describing: error))
  }
}

@available(macOS 14.0, *)
func shareableRows() async throws -> [[String: Any]] {
  let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
  var rows: [[String: Any]] = []
  for window in content.windows where rows.count < 50 {
    rows.append(row(for: window))
  }
  return rows
}

@available(macOS 14.0, *)
func row(for window: SCWindow) -> [String: Any] {
  let app = window.owningApplication?.applicationName ?? ""
  let title = window.title ?? ""
  let capturable = window.isOnScreen && window.frame.width > 2 && window.frame.height > 2
  var item: [String: Any] = [
    "id": window.windowID,
    "title": title.isEmpty ? app : title,
    "appName": app,
    "capturable": capturable
  ]
  if let icon = iconBase64(window.owningApplication?.bundleIdentifier) {
    item["iconPngBase64"] = icon
  }
  return item
}

@available(macOS 14.0, *)
func pngOf(windowId: Int?) async throws -> Data {
  let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
  guard let window = pick(content.windows, windowId: windowId) else {
    throw SnapError.noWindow
  }
  let filter = SCContentFilter(desktopIndependentWindow: window)
  let config = SCStreamConfiguration()
  let scale = await MainActor.run { NSScreen.main?.backingScaleFactor ?? 2 }
  config.width = max(1, Int(window.frame.width * scale))
  config.height = max(1, Int(window.frame.height * scale))
  config.showsCursor = false
  let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
  guard let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
    throw SnapError.encode
  }
  return png
}

@available(macOS 14.0, *)
func pick(_ windows: [SCWindow], windowId: Int?) -> SCWindow? {
  if let windowId {
    return windows.first { Int($0.windowID) == windowId }
  }
  let pid = NSWorkspace.shared.frontmostApplication?.processIdentifier
  let owned = windows.filter { $0.owningApplication?.processID == pid && $0.isOnScreen }
  return owned.first { ($0.title ?? "").isEmpty == false } ?? owned.first
}

func iconBase64(_ bundleId: String?) -> String? {
  guard let bundleId,
        let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else { return nil }
  let image = NSWorkspace.shared.icon(forFile: url.path)
  image.size = NSSize(width: 32, height: 32)
  guard let tiff = image.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else { return nil }
  return png.base64EncodedString()
}

func withTimeout<T>(_ seconds: Double, _ work: @escaping () async throws -> T) async throws -> T {
  try await withThrowingTaskGroup(of: T.self) { group in
    group.addTask { try await work() }
    group.addTask {
      try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
      throw SnapError.timeout
    }
    guard let value = try await group.next() else { throw SnapError.timeout }
    group.cancelAll()
    return value
  }
}

func watch(_ tokens: [String]) {
  let codes = tokens.compactMap(keyCode)
  guard codes.count == 2 else { return }
  var down = false
  while true {
    let held = codes.allSatisfy { CGEventSource.keyState(.combinedSessionState, key: $0) }
    if held && !down {
      down = true
      print("snap")
      fflush(stdout)
    } else if !held {
      down = false
    }
    usleep(30_000)
  }
}

func keyCode(_ token: String) -> CGKeyCode? {
  switch token {
  case "alt.left": return 58
  case "alt.right": return 61
  case "ctrl.left": return 59
  case "ctrl.right": return 62
  case "shift.left": return 56
  case "shift.right": return 60
  case "meta.left": return 55
  case "meta.right": return 54
  default: return nil
  }
}

enum SnapError: Error { case noWindow, encode, timeout }

func emit(_ object: [String: Any]) {
  guard JSONSerialization.isValidJSONObject(object),
        var data = try? JSONSerialization.data(withJSONObject: object) else { return }
  data.append(0x0A)
  FileHandle.standardOutput.write(data)
}

func fail(_ id: String, _ code: String, _ message: String) {
  emit(["id": id, "error": ["code": code, "message": message]])
}

func intValue(_ value: Any?) -> Int? {
  if let number = value as? NSNumber { return number.intValue }
  if let number = value as? Int { return number }
  return nil
}
