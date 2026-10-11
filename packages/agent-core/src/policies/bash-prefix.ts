/**
 * 再导出 ipc-contract 叶子。实现与 renderer 卡面共用；本文件留给 agent-core 相对 import。
 */
export {
  bashAllowCommand,
  bashCommandHasUnsafeOperators,
  bashCommandIsInterpreterStyle,
  commandBasename,
  commandFromToolInput,
  sessionAllowsBash,
  sessionAllowUsesBashTable,
  SESSION_BASH_COMMAND_MAX_CHARS
} from "@enjoy-agents/ipc-contract/bash-prefix"
