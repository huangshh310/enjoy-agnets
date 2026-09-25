/// 进程内按键与前台坐标点击。坐标路径会移动光标，只在 allowForeground 后调用。
import CoreGraphics
import Foundation

private let keyCodes: [String: CGKeyCode] = [
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9,
  "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17,
  "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "9": 25, "7": 26, "8": 28, "0": 29,
  "o": 31, "u": 32, "i": 34, "p": 35, "return": 36, "enter": 36,
  "l": 37, "j": 38, "k": 40, "n": 45, "m": 46,
  "tab": 48, "space": 49, "delete": 51, "escape": 53, "esc": 53,
  "left": 123, "right": 124, "down": 125, "up": 126
]

func postKey(pid: pid_t, combo: String) -> String? {
  let parts = combo.lowercased().split(separator: "+").map(String.init)
  guard let last = parts.last, let code = keyCodes[last] else { return "unknown_key" }
  var flags = CGEventFlags()
  for part in parts.dropLast() {
    switch part {
    case "cmd", "command": flags.insert(.maskCommand)
    case "ctrl", "control": flags.insert(.maskControl)
    case "alt", "option": flags.insert(.maskAlternate)
    case "shift": flags.insert(.maskShift)
    default: return "unknown_key"
    }
  }
  guard let down = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: true),
        let up = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: false) else {
    return "action_failed"
  }
  down.flags = flags
  up.flags = flags
  down.postToPid(pid)
  up.postToPid(pid)
  return nil
}

func clickPoint(pid: pid_t, x: Double, y: Double, button: String, count: Int) {
  let right = button == "right"
  let downType: CGEventType = right ? .rightMouseDown : .leftMouseDown
  let upType: CGEventType = right ? .rightMouseUp : .leftMouseUp
  let cgButton: CGMouseButton = right ? .right : .left
  let point = CGPoint(x: x, y: y)
  for step in 1...max(1, min(count, 3)) {
    guard let down = CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: point, mouseButton: cgButton),
          let up = CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: point, mouseButton: cgButton) else { return }
    down.setIntegerValueField(.mouseEventClickState, value: Int64(step))
    up.setIntegerValueField(.mouseEventClickState, value: Int64(step))
    down.postToPid(pid)
    up.postToPid(pid)
  }
}

func dragPoint(pid: pid_t, x: Double, y: Double, x2: Double, y2: Double) {
  let start = CGPoint(x: x, y: y)
  let end = CGPoint(x: x2, y: y2)
  guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: start, mouseButton: .left),
        let move = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: end, mouseButton: .left),
        let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: end, mouseButton: .left) else { return }
  down.postToPid(pid)
  move.postToPid(pid)
  up.postToPid(pid)
}
