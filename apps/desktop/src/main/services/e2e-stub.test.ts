import assert from "node:assert/strict"
import { test } from "node:test"
import { createE2eStubStream, lastUserText, stubApprovedWrite } from "./e2e-stub.ts"

test("lastUserText 取最后一条用户字", () => {
  assert.equal(
    lastUserText([
      { role: "user", content: "one" },
      { role: "assistant", content: "nope" },
      { role: "user", content: "two" }
    ]),
    "two"
  )
})

test("write 提示发出审批 part", async () => {
  const parts: string[] = []
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "please write a note" }],
    new AbortController().signal
  )) {
    parts.push(String(part.type))
  }
  assert.deepEqual(parts, ["tool-approval-request"])
})

test("已批准写盘后回 stub-ok allowed write", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      { role: "user", content: "write" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /stub-ok allowed write/)
})

test("附件文件名会出现在 stub 回复里", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      {
        role: "user",
        content: [
          { type: "text", text: "read this" },
          { type: "file", filename: "note.txt", mediaType: "text/plain", data: new Uint8Array() }
        ]
      } as never
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /attached:note.txt/)
})

test("stubApprovedWrite 识别 tool-approval-response", () => {
  assert.equal(
    stubApprovedWrite([
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never
    ]),
    true
  )
})
