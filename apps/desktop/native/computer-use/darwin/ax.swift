/// macOS AX 列表、快照与动作。后台点击走 AXPress，不移动硬件光标。
import AppKit
import ApplicationServices
import Foundation

func listApps() -> [[String: Any]] {
  NSWorkspace.shared.runningApplications.filter { $0.activationPolicy == .regular }.map { app in
    [
      "pid": Int(app.processIdentifier),
      "name": app.localizedName ?? "",
      "frontmost": app.isActive,
      "backgroundClick": AXIsProcessTrusted()
    ]
  }
}

func snapshot(pid: pid_t) -> [String: Any] {
  let app = AXUIElementCreateApplication(pid)
  let name = NSRunningApplication(processIdentifier: pid)?.localizedName ?? "app"
  var elements: [[String: Any]] = []
  for (index, window) in windows(of: app).prefix(4).enumerated() {
    walk(window, path: "\(index)", into: &elements, depth: 0)
  }
  return [
    "id": "obs_local",
    "pid": Int(pid),
    "windowId": "\(pid)",
    "appName": name,
    "elements": elements,
    "createdAt": Int(Date().timeIntervalSince1970 * 1000),
    "platform": "darwin"
  ]
}

func actReply(id: String, params: [String: Any]) {
  guard AXIsProcessTrusted() else {
    fail(id, "permission_denied", "Accessibility is not granted to this executor.")
    return
  }
  let action = params["action"] as? String ?? ""
  if action == "wait" {
    sleepWait(params["waitMs"])
    emit(["id": id, "result": ["delivery": "background"]])
    return
  }
  let pid = pid_t(intValue(params["pid"]) ?? 0)
  let allow = boolValue(params["allowForeground"])
  if let code = performAct(pid: pid, action: action, params: params, allowForeground: allow) {
    fail(id, code, messageFor(code))
    return
  }
  emit(["id": id, "result": ["delivery": allow ? "foreground" : "background"]])
}

func performAct(pid: pid_t, action: String, params: [String: Any], allowForeground: Bool) -> String? {
  if action == "move" || action == "drag" {
    return allowForeground ? mouseAct(pid: pid, action: action, params: params) : "needs_foreground"
  }
  if action == "click", doubleValue(params["x"]) != nil, (params["elementId"] as? String ?? "").isEmpty {
    return allowForeground ? mouseAct(pid: pid, action: action, params: params) : "needs_foreground"
  }
  if action == "key" {
    return postKey(pid: pid, combo: params["key"] as? String ?? "")
  }
  guard let element = resolveElement(pid: pid, params: params) else { return "stale_observation" }
  if let name = params["elementName"] as? String, !name.isEmpty, !matches(element, name: name) {
    return "stale_observation"
  }
  let ok = axAct(element, action: action, params: params)
  if ok { return nil }
  if !allowForeground { return "needs_foreground" }
  activate(pid)
  if axAct(element, action: action, params: params) { return nil }
  return "action_failed"
}

func resolveElement(pid: pid_t, params: [String: Any]) -> AXUIElement? {
  let app = AXUIElementCreateApplication(pid)
  let path = params["elementId"] as? String ?? ""
  return element(app: app, path: path)
}

func axAct(_ element: AXUIElement, action: String, params: [String: Any]) -> Bool {
  switch action {
  case "click":
    return press(element, button: params["button"] as? String ?? "left", count: intValue(params["count"]) ?? 1)
  case "type":
    return setValue(element, params["text"] as? String ?? "")
  case "scroll":
    let dy = doubleValue(params["dy"]) ?? 1
    return perform(element, dy < 0 ? "AXScrollUp" : "AXScrollDown")
  default:
    return false
  }
}

func press(_ element: AXUIElement, button: String, count: Int) -> Bool {
  if button == "middle" { return false }
  let name = button == "right" ? kAXShowMenuAction as String : kAXPressAction as String
  var ok = true
  for _ in 0..<max(1, min(count, 3)) {
    ok = perform(element, name) && ok
  }
  return ok
}

func mouseAct(pid: pid_t, action: String, params: [String: Any]) -> String? {
  guard let x = doubleValue(params["x"]), let y = doubleValue(params["y"]) else { return "needs_foreground" }
  activate(pid)
  clickPoint(pid: pid, x: x, y: y, button: params["button"] as? String ?? "left", count: intValue(params["count"]) ?? 1)
  if action == "drag", let x2 = doubleValue(params["x2"]), let y2 = doubleValue(params["y2"]) {
    dragPoint(pid: pid, x: x, y: y, x2: x2, y2: y2)
  }
  return nil
}

func messageFor(_ code: String) -> String {
  switch code {
  case "needs_foreground": return "Background AX action failed. Retry with allowForeground."
  case "stale_observation": return "Element is not in this snapshot."
  case "unknown_key": return "Unknown key."
  default: return "Action could not be performed."
  }
}
