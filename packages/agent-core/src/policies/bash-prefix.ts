/**
 * 再导出 ipc-contract 叶子。实现与 renderer 卡面共用；本文件留给 agent-core 相对 import。
 */
export {
  bashAllowPrefix,
  bashCommandHasUnsafeOperators,
  bashCommandIsInterpreterStyle,
  commandBasename,
  commandFromToolInput,
  sessionAllowsBash
} from "@enjoy-agents/ipc-contract/bash-prefix"
