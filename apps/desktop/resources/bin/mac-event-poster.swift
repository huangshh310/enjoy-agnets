import Cocoa
import CoreGraphics
import Foundation

// Usage:
//   mac-event-poster click <pid> <x> <y>
//   mac-event-poster type <pid> <text>

func main() {
    let args = CommandLine.arguments
    guard args.count >= 3 else {
        fputs("Usage: mac-event-poster <click|type> <pid> [args...]\n", stderr)
        exit(1)
    }

    let action = args[1]
    guard let pid = Int32(args[2]) else {
        fputs("Invalid pid: \(args[2])\n", stderr)
        exit(1)
    }

    if action == "click" && args.count >= 5 {
        guard let x = Double(args[3]), let y = Double(args[4]) else {
            fputs("Invalid coordinates: \(args[3]), \(args[4])\n", stderr)
            exit(1)
        }
        let pt = CGPoint(x: x, y: y)
        if let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left),
           let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left) {
            down.postToPid(pid)
            usleep(20000) // 20ms click duration
            up.postToPid(pid)
            print("OK")
            exit(0)
        } else {
            fputs("Failed to create mouse event\n", stderr)
            exit(1)
        }
    } else if action == "type" && args.count >= 4 {
        let text = args[3]
        var chars = Array(text.utf16)
        if let event = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true) {
            event.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: &chars)
            event.postToPid(pid)
            print("OK")
            exit(0)
        } else {
            fputs("Failed to create keyboard event\n", stderr)
            exit(1)
        }
    } else {
        fputs("Unknown action or insufficient arguments\n", stderr)
        exit(1)
    }
}

main()
