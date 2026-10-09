/**
 * 会话回灌世代。发送时加一代，仍在 await 的 loadSession 必须丢掉结果。
 */

let hydrateGeneration = 0

export function bumpSessionHydrateGeneration(): number {
  hydrateGeneration += 1
  return hydrateGeneration
}

export function isSessionHydrateCurrent(generation: number): boolean {
  return generation === hydrateGeneration
}
