/**
 * bash / code_mode 的界面文本通道。
 * execute 的返回值只留给模型；更长的一份按 toolCallId 暂存，流事件再取走。
 */
import { CLIP_COMMAND_CHARS, CLIP_COMMAND_UI_CHARS, clipToolText } from "./clip-tool-text.ts"

export type CommandDisplay = {
  stdout: string
  stderr: string
}

const pending = new Map<string, CommandDisplay>()
const MAX_PENDING = 32

/** 模型 16_000，界面 120_000。两份都是头尾截断。 */
export function splitCommandSurfaces(stdout: string, stderr: string): {
  modelStdout: string
  modelStderr: string
  display: CommandDisplay
} {
  return {
    modelStdout: clipToolText(stdout, CLIP_COMMAND_CHARS),
    modelStderr: clipToolText(stderr, CLIP_COMMAND_CHARS),
    display: {
      stdout: clipToolText(stdout, CLIP_COMMAND_UI_CHARS),
      stderr: clipToolText(stderr, CLIP_COMMAND_UI_CHARS)
    }
  }
}

/** 拆开两份文本，把界面份按 toolCallId 记下，返回只含模型份的 stdout/stderr。 */
export function modelCommandText(
  toolCallId: string | undefined,
  stdout: string,
  stderr: string
): { stdout: string; stderr: string } {
  const surfaces = splitCommandSurfaces(stdout, stderr)
  publishCommandDisplay(toolCallId, surfaces.display)
  return { stdout: surfaces.modelStdout, stderr: surfaces.modelStderr }
}

/** 记下界面份。空 id 不记，避免串到下一条工具。 */
export function publishCommandDisplay(toolCallId: string | undefined, display: CommandDisplay): void {
  const id = toolCallId?.trim()
  if (!id) return
  if (pending.size >= MAX_PENDING) {
    const oldest = pending.keys().next().value
    if (oldest) pending.delete(oldest)
  }
  pending.set(id, display)
}

/** 取走界面份。没有则返回 undefined，调用方回落模型文本。 */
export function consumeCommandDisplay(toolCallId: string | undefined): CommandDisplay | undefined {
  const id = toolCallId?.trim()
  if (!id) return undefined
  const display = pending.get(id)
  if (display) pending.delete(id)
  return display
}

/**
 * 复制结果并挂上界面字段。不改原对象，因此模型消息仍是短文本。
 */
export function withCommandDisplay(result: unknown, toolCallId: string | undefined): unknown {
  const display = consumeCommandDisplay(toolCallId)
  if (!display || !isRecord(result)) return result
  return { ...result, displayStdout: display.stdout, displayStderr: display.stderr }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
