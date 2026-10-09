/**
 * node:test：解析 electron 桩，并把无后缀相对 import 补成 .ts。
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "electron") {
    return { shortCircuit: true, url: new URL("./electron-stub.mjs", import.meta.url).href }
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
