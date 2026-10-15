/**
 * leo：子进程跑（transform-types）真 modelMessagesForStart，输出两种场景的模型消息，父测试断言。
 */
process.env.ENJOY_E2E_STUB = "1"
process.env.ENJOY_E2E_USERDATA ||= "/tmp/enjoy-imgonly-start"

const { modelMessagesForStart } = await import("./agent-run-start.ts")
const { isAttachmentOnlyPlaceholder } = await import("./to-model-messages.ts")

async function scene(attachments: string[]) {
  const messages = await modelMessagesForStart({
    sessionId: `ses_imgonly_${attachments.length}`,
    messages: [
      { id: "u1", role: "user", content: "先说一句" },
      { id: "a1", role: "assistant", content: "好" },
      { id: "u2", role: "user", content: "" }
    ],
    attachments
  } as never)
  return { roles: messages.map((m) => m.role), lastPlaceholder: isAttachmentOnlyPlaceholder(messages.at(-1)) }
}

console.log(`RESULT ${JSON.stringify({ image: await scene(["ast_only"]), none: await scene([]) })}`)
process.exit(0)
export {}
