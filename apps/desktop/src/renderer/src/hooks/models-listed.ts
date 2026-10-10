/**
 * models.list 是否已经回来。没回来时不要催 NEED_MODEL。
 */
let modelsListed = false

export function markModelsListed(): void {
  modelsListed = true
}

export function modelsHaveListed(): boolean {
  return modelsListed
}

export function resetModelsListed(): void {
  modelsListed = false
}
