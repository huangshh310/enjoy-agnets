/**
 * pnpm dev 复检入口。打包后即使带 ENJOY_DEV_SEED_AUTO_P2 也不写库。
 */
import { app } from "electron"
import { buildAutoP2Fixture, isDevAutoP2SeedAllowed, writeAutoP2Fixture } from "./auto-p2-seed"

export function seedDevAutoP2IfRequested(): void {
  const flag = process.env.ENJOY_DEV_SEED_AUTO_P2 === "1"
  const isolated = Boolean(process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA)
  if (!isDevAutoP2SeedAllowed({ flag, packaged: app.isPackaged, isolatedUserData: isolated })) {
    if (flag && app.isPackaged) console.warn("ENJOY_DEV_SEED_AUTO_P2 ignored in packaged builds")
    if (flag && !isolated) console.warn("ENJOY_DEV_SEED_AUTO_P2 needs ENJOY_DEV_USERDATA or ENJOY_E2E_USERDATA")
    return
  }
  writeAutoP2Fixture(buildAutoP2Fixture(Date.now(), true))
}
