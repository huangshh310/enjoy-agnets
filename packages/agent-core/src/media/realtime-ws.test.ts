import assert from "node:assert/strict"
import { test } from "node:test"
import {
  bindRealtimeSocket,
  parseRealtimeSocketMessage,
  realtimeUrlFor
} from "./realtime-ws.ts"

test("OpenAI realtime 拼出 wss URL", () => {
  const url = realtimeUrlFor("openai", "gpt-4o-realtime-preview")
  assert.ok(url?.startsWith("wss://api.openai.com/v1/realtime"))
  assert.ok(url?.includes("gpt-4o-realtime-preview"))
})

test("未知供应商不假装有 WS", () => {
  assert.equal(realtimeUrlFor("ollama", "llama3"), null)
})

test("解析音频与文本帧", () => {
  assert.deepEqual(parseRealtimeSocketMessage('{"type":"response.audio.delta","delta":"abc"}'), {
    kind: "audio",
    value: "abc"
  })
  assert.deepEqual(parseRealtimeSocketMessage('{"type":"response.audio_transcript.delta","delta":"hi"}'), {
    kind: "text",
    value: "hi"
  })
})

test("bind 后把音频帧包成 input_audio_buffer.append", () => {
  const sent: string[] = []
  const transport = bindRealtimeSocket({
    send: (data) => sent.push(data),
    close: () => undefined
  })
  transport.send("chunk")
  assert.equal(JSON.parse(sent[0] ?? "{}").type, "input_audio_buffer.append")
})
