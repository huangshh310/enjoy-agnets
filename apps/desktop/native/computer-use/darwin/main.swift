/// macOS Computer Use 执行器入口：stdin 换行 JSON，stdout 一行一条响应。
import AppKit
import ApplicationServices
import Foundation

while let line = readLine(strippingNewline: true) {
  guard let data = line.data(using: .utf8),
        let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let id = obj["id"] as? String,
        let method = obj["method"] as? String else { continue }
  dispatch(id: id, method: method, params: obj["params"] as? [String: Any] ?? [:])
}

func dispatch(id: String, method: String, params: [String: Any]) {
  switch method {
  case "doctor":
    let trusted = AXIsProcessTrusted()
    emit(["id": id, "result": ["trusted": trusted, "backgroundClick": trusted]])
  case "list_apps":
    emit(["id": id, "result": ["apps": listApps()]])
  case "snapshot":
    snapshotReply(id: id, params: params)
  case "act":
    actReply(id: id, params: params)
  case "screenshot":
    fail(id, "screenshot_unavailable", "Host captures thumbnails.")
  default:
    fail(id, "unknown_method", method)
  }
}

func snapshotReply(id: String, params: [String: Any]) {
  guard AXIsProcessTrusted() else {
    fail(id, "permission_denied", "Accessibility is not granted to this executor.")
    return
  }
  let pid = pid_t(intValue(params["pid"]) ?? Int(NSWorkspace.shared.frontmostApplication?.processIdentifier ?? 0))
  emit(["id": id, "result": ["observation": snapshot(pid: pid)]])
}

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
  if let number = value as? Double { return Int(number) }
  return nil
}

func doubleValue(_ value: Any?) -> Double? {
  if let number = value as? NSNumber { return number.doubleValue }
  if let number = value as? Double { return number }
  if let number = value as? Int { return Double(number) }
  return nil
}

func boolValue(_ value: Any?) -> Bool {
  if let flag = value as? Bool { return flag }
  if let number = value as? NSNumber { return number.boolValue }
  return false
}
