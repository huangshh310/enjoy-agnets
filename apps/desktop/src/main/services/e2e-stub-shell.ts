/**
 * stub 命令夹具（给 luna 验 bash 完全相同匹配 / code_mode 只允许一次）：
 * 触发词各吐一张真审批卡，走正常 approval.required → decide → applySessionAllowDecision，
 * 会话允许的记录与匹配都是真的（`isToolApproved` 调真实 resolveToolApproval）。
 * 允许后只吐假 tool-result，**绝不**真跑命令或脚本（execute-stored-tool 对这些夹具入参直接跳过）。
 *
 * 触发词（整句 trim 后完全相等，不区分大小写）：
 * - 「run bash ls」     → bash `ls`
 * - 「run bash ls -la」 → bash `ls -la`（与上一条同前缀；整句相等匹配，不会被 `run bash ls` 吞掉）
 * - 「run code」        → code_mode `{ path, source, command }`
 * - 「run long」        → bash，命令超过 4096 字符
 * - 「run pipe」        → bash `ls | head`
 */

export type StubShellFixture = {
  trigger: string
  /** toolCallId / approvalId 里的短名。 */
  key: string
  toolName: "bash" | "code_mode"
  input: Record<string, string>
}

export const STUB_LONG_COMMAND = `echo ${"a".repeat(4200)}`

export const STUB_SHELL_FIXTURES: readonly StubShellFixture[] = [
  { trigger: "run bash ls -la", key: "lsla", toolName: "bash", input: { command: "ls -la" } },
  { trigger: "run bash ls", key: "ls", toolName: "bash", input: { command: "ls" } },
  {
    trigger: "run code",
    key: "code",
    toolName: "code_mode",
    input: { path: "stub-script.sh", source: "echo stub-code", command: "sh stub-script.sh" }
  },
  { trigger: "run long", key: "long", toolName: "bash", input: { command: STUB_LONG_COMMAND } },
  { trigger: "run pipe", key: "pipe", toolName: "bash", input: { command: "ls | head" } }
]

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase()
}

/** 整句完全相等才认；`run bash ls -la` 不会落到 `run bash ls`。 */
export function stubShellFixtureFor(prompt: string): StubShellFixture | undefined {
  const text = normalizePrompt(prompt)
  return STUB_SHELL_FIXTURES.find((fixture) => fixture.trigger === text)
}

/** 库里存的审批入参正是某个夹具：重启无 waiter 时 executeStoredTool 不得真跑。 */
export function isStubShellFixtureInput(toolName: string, args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const rec = args as Record<string, unknown>
  return STUB_SHELL_FIXTURES.some(
    (fixture) =>
      fixture.toolName === toolName &&
      Object.entries(fixture.input).every(([key, value]) => rec[key] === value)
  )
}

let stubShellSeq = 0

export function nextStubShellIds(fixture: StubShellFixture): { toolCallId: string; approvalId: string } {
  stubShellSeq += 1
  return {
    toolCallId: `tool_stub_sh_${fixture.key}_${stubShellSeq}`,
    approvalId: `apr_stub_sh_${fixture.key}_${stubShellSeq}`
  }
}

/** `apr_stub_sh_<key>_N` → `tool_stub_sh_<key>_N`；不是本夹具的审批回空。 */
export function stubShellToolCallIdFor(approvalId: string): string {
  const match = /^apr_stub_sh_([a-z]+)_(\d+)$/.exec(approvalId)
  return match ? `tool_stub_sh_${match[1]}_${match[2]}` : ""
}

export function stubShellApprovalPart(
  fixture: StubShellFixture,
  ids: { toolCallId: string; approvalId: string }
): Record<string, unknown> {
  return {
    type: "tool-approval-request",
    toolCallId: ids.toolCallId,
    approvalId: ids.approvalId,
    toolName: fixture.toolName,
    input: fixture.input
  }
}

export function stubShellToolCallPart(fixture: StubShellFixture, toolCallId: string): Record<string, unknown> {
  return { type: "tool-call", toolCallId, toolName: fixture.toolName, input: fixture.input }
}

/** 假输出：形状同真 bash / code_mode，内容只是一句夹具文本。 */
export function stubShellResultPart(fixture: StubShellFixture, toolCallId: string): Record<string, unknown> {
  const stdout = `stub fake output (${fixture.key}); nothing was executed\n`
  const output =
    fixture.toolName === "code_mode"
      ? { path: fixture.input.path, exitCode: 0, stdout, stderr: "" }
      : { command: fixture.input.command, exitCode: 0, stdout, stderr: "" }
  return { type: "tool-result", toolCallId, toolName: fixture.toolName, input: fixture.input, output }
}

/** 正文：`stub-ok ran <key>`，e2e 数这一句判断这一轮是否执行。 */
export function stubShellDoneText(fixture: StubShellFixture): string {
  return `stub-ok ran ${fixture.key}`
}
