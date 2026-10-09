/**
 * E2E 夹具：只种冒烟用的四条。复检 extras 走 ENJOY_DEV_SEED_AUTO_P2。
 */
import { isE2eStub } from "./e2e-stub"
import { buildAutoP2Fixture, writeAutoP2Fixture } from "./auto-p2-seed"

export function seedE2eAutomations(now = Date.now()): void {
  if (!isE2eStub()) return
  writeAutoP2Fixture(buildAutoP2Fixture(now, process.env.ENJOY_DEV_SEED_AUTO_P2 === "1"))
}
