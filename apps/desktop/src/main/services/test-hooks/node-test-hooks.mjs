/**
 * node:test：解析 electron 桩，并把无后缀相对 import 补成 .ts。
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "electron") {
    return { shortCircuit: true, url: new URL("./electron-stub.mjs", import.meta.url).href }
  }
  // 渲染进程别名 `@renderer/*`（vite / tsconfig paths 同款），让行为测试能直接加载发送链路。
  if (specifier.startsWith("@renderer/")) {
    specifier = new URL(`../../../renderer/src/${specifier.slice("@renderer/".length)}`, import.meta.url).href
    if (/\.(ts|js|mjs|cjs|json)$/.test(specifier)) return nextResolve(specifier, context)
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return nextResolve(`${specifier}/index.ts`, context)
    }
  }
  if (specifier.startsWith(".") && !/\.(ts|js|mjs|cjs|json)$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      try {
        return await nextResolve(`${specifier}/index.ts`, context)
      } catch {
        return nextResolve(specifier, context)
      }
    }
  }
  return nextResolve(specifier, context)
}
