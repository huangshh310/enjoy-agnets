/// AX 树行走与路径解析。控件编号是窗口下标加子节点下标。
import AppKit
import ApplicationServices
import Foundation

func windows(of app: AXUIElement) -> [AXUIElement] {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &value) == .success,
        let list = value as? [AXUIElement] else { return [] }
  return list
}

func children(of element: AXUIElement) -> [AXUIElement] {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &value) == .success,
        let list = value as? [AXUIElement] else { return [] }
  return list
}

func stringAttr(_ element: AXUIElement, _ name: String) -> String {
  var value: CFTypeRef?
  guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return "" }
  return value as? String ?? ""
}

func walk(_ element: AXUIElement, path: String, into elements: inout [[String: Any]], depth: Int) {
  if elements.count >= 80 || depth > 6 { return }
  let role = stringAttr(element, kAXRoleAttribute)
  let title = stringAttr(element, kAXTitleAttribute)
  let desc = stringAttr(element, kAXDescriptionAttribute)
  let value = stringAttr(element, kAXValueAttribute)
  let name = !title.isEmpty ? title : (!desc.isEmpty ? desc : value)
  if !name.isEmpty {
    var row: [String: Any] = ["id": path, "role": role, "name": name, "clickable": isClickable(element)]
    if !value.isEmpty { row["value"] = value }
    elements.append(row)
  }
  for (index, child) in children(of: element).prefix(24).enumerated() {
    walk(child, path: "\(path).\(index)", into: &elements, depth: depth + 1)
  }
}

func isClickable(_ element: AXUIElement) -> Bool {
  var names: CFArray?
  guard AXUIElementCopyActionNames(element, &names) == .success, let list = names as? [String] else { return false }
  return list.contains(kAXPressAction as String) || list.contains(kAXShowMenuAction as String)
}

func element(app: AXUIElement, path: String) -> AXUIElement? {
  let parts = path.split(separator: ".").compactMap { Int($0) }
  guard let first = parts.first else { return nil }
  let wins = windows(of: app)
  guard first >= 0, first < wins.count else { return nil }
  var current = wins[first]
  for index in parts.dropFirst() {
    let list = children(of: current)
    guard index >= 0, index < list.count else { return nil }
    current = list[index]
  }
  return current
}

func matches(_ element: AXUIElement, name: String) -> Bool {
  stringAttr(element, kAXTitleAttribute) == name
    || stringAttr(element, kAXDescriptionAttribute) == name
    || stringAttr(element, kAXValueAttribute) == name
}

func perform(_ element: AXUIElement, _ action: String) -> Bool {
  AXUIElementPerformAction(element, action as CFString) == .success
}

func setValue(_ element: AXUIElement, _ text: String) -> Bool {
  AXUIElementSetAttributeValue(element, kAXValueAttribute as CFString, text as CFTypeRef) == .success
}

func activate(_ pid: pid_t) {
  NSRunningApplication(processIdentifier: pid)?.activate()
  Thread.sleep(forTimeInterval: 0.15)
}

func sleepWait(_ value: Any?) {
  let ms = min(intValue(value) ?? 0, 5000)
  if ms > 0 { Thread.sleep(forTimeInterval: Double(ms) / 1000) }
}
