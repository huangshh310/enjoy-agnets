/**
 * 个人资料读写：settings 快照为准，旧 localStorage 迁一次。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { DEFAULT_BLOBATAR_CONFIG } from "../../avatar/blobatar.types"
import {
  fromAccountProfilePref,
  takeLegacyLocalProfile,
  toAccountProfilePref
} from "../lib/profile-storage"
import type { ExtendedUserProfile } from "../types/profile.types"

function slugHandle(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "enjoy-agents"
  return `@${slug}`
}

export function buildInitialProfile(userName: string, hasKey: boolean): ExtendedUserProfile {
  const name = userName.trim() || "Enjoy Engineer"
  return {
    name,
    handle: slugHandle(name),
    email: "",
    avatarLetter: name.slice(0, 1).toUpperCase(),
    roleTitle: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    joinedAt: "",
    safeStorageActive: hasKey,
    coverPreset: "glyph-rain",
    blobatarConfig: { ...DEFAULT_BLOBATAR_CONFIG, name },
    activeDevices: [
      {
        id: "local",
        name: "Enjoy Agents Desktop",
        os: typeof navigator === "undefined" ? "Desktop" : navigator.platform || "Desktop",
        ip: "",
        lastActive: "",
        isCurrent: true
      }
    ]
  }
}

function mergeStored(
  userName: string,
  hasKey: boolean,
  stored: ReturnType<typeof fromAccountProfilePref> | Partial<ReturnType<typeof fromAccountProfilePref>> | null
): ExtendedUserProfile {
  const initial = buildInitialProfile(stored?.name || userName, hasKey)
  return stored ? { ...initial, ...stored } : initial
}

export function useAccountProfile() {
  const queryClient = useQueryClient()
  const userName = useChatStore((state) => state.userName)
  const hasKey = useChatStore((state) => state.hasKey)
  const settings = useSettingsSnapshot()
  const pref = settings.data?.preferences.accountProfile
  const [profile, setProfile] = useState(() => mergeStored(userName, hasKey, null))
  const migrated = useRef(false)

  useEffect(() => {
    const name = useChatStore.getState().userName
    if (pref) {
      setProfile(mergeStored(name, hasKey, fromAccountProfilePref(pref)))
      return
    }
    if (migrated.current || !hasIde()) return
    const legacy = takeLegacyLocalProfile()
    if (!legacy) return
    migrated.current = true
    const next = mergeStored(name, hasKey, legacy)
    setProfile(next)
    void patchPreferences({ accountProfile: toAccountProfilePref(next) }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    )
  }, [pref, hasKey, queryClient])

  const resolvedProfile = useMemo(
    () => ({ ...profile, safeStorageActive: hasKey }),
    [profile, hasKey]
  )

  async function save(updated: ExtendedUserProfile) {
    setProfile(updated)
    if (updated.name) useChatStore.setState({ userName: updated.name })
    if (!hasIde()) return
    await patchPreferences({ accountProfile: toAccountProfilePref(updated) })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return { profile: resolvedProfile, save }
}
