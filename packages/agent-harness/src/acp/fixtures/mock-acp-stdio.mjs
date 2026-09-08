#!/usr/bin/env node
/**
 * 最小 ACP stdio 桩：initialize → session/new → prompt 时要审批，通过后回一条文本。
 */
import { createInterface } from "node:readline"

let promptId = null
const rl = createInterface({ input: process.stdin })
rl.on("line", (line) => {
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }
  if (typeof msg.id === "number" && msg.result && promptId != null) {
    write({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "custom-acp-ok" }
      }
    })
    write({ jsonrpc: "2.0", id: promptId, result: { stopReason: "end_turn" } })
    promptId = null
    return
  }
  if (msg.method === "initialize") {
    write({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: 1 } })
    return
  }
  if (msg.method === "session/new") {
    write({ jsonrpc: "2.0", id: msg.id, result: { sessionId: "sess_custom" } })
    return
  }
  if (msg.method === "session/prompt") {
    promptId = msg.id
    write({
      jsonrpc: "2.0",
      id: 9001,
      method: "session/request_permission",
      params: {
        sessionId: "sess_custom",
        toolCall: {
          toolCallId: "t1",
          title: "bash",
          kind: "execute",
          rawInput: { command: "echo hi" }
        },
        options: [
          { optionId: "allow-once", kind: "allow_once" },
          { optionId: "reject", kind: "reject" }
        ]
      }
    })
  }
})

function write(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}
