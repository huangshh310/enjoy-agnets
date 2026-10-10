/**
 * pnpm dev:cost 复检入口。打包后即使带 ENJOY_DEV_SEED_COST 也不写库。
 */
import { app } from "electron"
import { isDevCostSeedAllowed } from "./cost-seed"
import { writeCostFixture } from "./cost-seed-write"
import { getSetting } from "./database"

export async function seedDevCostIfRequested(): Promise<void> {
  const flag = process.env.ENJOY_DEV_SEED_COST === "1"
  const isolated = Boolean(process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA)
  if (!isDevCostSeedAllowed({ flag, packaged: app.isPackaged, isolatedUserData: isolated })) {
    if (flag && app.isPackaged) console.warn("ENJOY_DEV_SEED_COST ignored in packaged builds")
    if (flag && !isolated) console.warn("ENJOY_DEV_SEED_COST needs ENJOY_DEV_USERDATA or ENJOY_E2E_USERDATA")
    return
  }
  const workspaceId = getSetting("lastWorkspaceId")
  if (!workspaceId) {
    console.warn("ENJOY_DEV_SEED_COST needs a workspace (ENJOY_E2E_WORKSPACE)")
    return
  }
  await writeCostFixture(workspaceId)
  console.log("COST-P3 review seed (dev only, never packaged)")
}
