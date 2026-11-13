/**
 * 夹具读店入口：相对再导出 useChatStore，避免测试直接 value-import chat-store.ts
 *（其 value-import 了 @enjoy-agents/ipc-contract 入口，会触发 harness 一层守卫）。
 * 不改 store 生产行为。
 */
export { useChatStore } from "../../../../stores/chat-store.ts"
