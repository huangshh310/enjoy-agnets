/**
 * 会话回灌世代。发送时加一代：过期回灌不得覆盖乐观消息，历史行仍合并。
 */

let hydrateGeneration = 0

export function bumpSessionHydrateGeneration(): number {
  hydrateGeneration += 1
  return hydrateGeneration
}

export function isSessionHydrateCurrent(generation: number): boolean {
  return generation === hydrateGeneration
}
