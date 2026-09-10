/**
 * 个人资料：主进程 preferences.accountProfile 为准；旧 localStorage 只迁移一次。
 */
import type { AccountProfilePref } from "@enjoy-agents/ipc-contract"
import type { ExtendedUserProfile } from "../types/profile.types"

const LEGACY_KEY = "enjoy:account-profile"

export type StoredAccountProfile = Pick<
  ExtendedUserProfile,
  "name" | "handle" | "email" | "roleTitle" | "coverPreset" | "blobatarConfig"
>

export function loadStoredProfile(): Partial<StoredAccountProfile> | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<StoredAccountProfile>
  } catch {
    return null
  }
}

export function takeLegacyLocalProfile(): Partial<StoredAccountProfile> | null {
  const stored = loadStoredProfile()
  if (stored) localStorage.removeItem(LEGACY_KEY)
  return stored
}

export function toAccountProfilePref(profile: StoredAccountProfile): AccountProfilePref {
  return {
    name: profile.name,
    handle: profile.handle,
    email: profile.email,
    roleTitle: profile.roleTitle,
    coverPreset: profile.coverPreset,
    blobatar: profile.blobatarConfig
  }
}

export function fromAccountProfilePref(pref: AccountProfilePref): StoredAccountProfile {
  return {
    name: pref.name,
    handle: pref.handle,
    email: pref.email,
    roleTitle: pref.roleTitle,
    coverPreset: pref.coverPreset,
    blobatarConfig: {
      name: pref.blobatar?.name || pref.name || "Enjoy Agents",
      expression: pref.blobatar?.expression as StoredAccountProfile["blobatarConfig"]["expression"],
      hue: pref.blobatar?.hue,
      tone: pref.blobatar?.tone,
      background: pref.blobatar?.background as StoredAccountProfile["blobatarConfig"]["background"],
      animate: pref.blobatar?.animate as StoredAccountProfile["blobatarConfig"]["animate"]
    }
  }
}
