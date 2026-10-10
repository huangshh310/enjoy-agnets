/**
 * Personal hub (account details / notifications) page catalog.
 */

export const enAccountPages = {
  navProfile: "Account details",
  navNotifications: "Notifications",
  searchPlaceholder: "Search account settings...",
  crumbTitle: "Personal hub",

  notifications: {
    title: "Notifications & alerts",
    hint: "Toggles persist to local preferences. The main process raises system notifications for approvals and finished tasks.",
    sectionTitle: "Desktop push & interaction",
    desktopTitle: "OS desktop notifications",
    desktopDesc: "Show a system notification when a task finishes in the background.",
    approvalTitle: "Approval request alerts",
    approvalDesc: "Show a system notification when a write or terminal approval parks.",
    soundTitle: "Task completion sound",
    soundDesc: "Whether the completion notification plays a system sound.",
    on: "On",
    off: "Off"
  },

  security: {
    title: "Credential encryption & hardware security",
    vaultProtected: "Key in vault",
    vaultEmpty: "No key stored",
    vaultTitle: "Encrypted on this device",
    vaultDesc: "Keys stay on this machine. This page only shows whether one is saved, never the secret itself.",
    endpointLabel: "Current endpoint",
    currentDevice: "This device"
  },

  hero: {
    share: "Share",
    copied: "Copied",
    edit: "Edit",
    avatarHint: "Click to customize your Blobatar avatar",
    contributions: "Contributions this year",
    lifetimeTokens: "Lifetime tokens",
    peakTokens: "Peak tokens",
    longestTask: "Longest task",
    topStreak: "Top streak"
  },

  heatmap: {
    activity: "Activity",
    count: "{n}×",
    tooltip: "{date}: {n} activities",
    periodHintSuffix: "of activity",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    start: "Start",
    today: "Today",
    less: "Less",
    more: "More"
  },

  charts: {
    tokens: "Tokens",
    agents: "Agents",
    runsUnit: "runs",
    day: "Day {n}"
  },

  editDialog: {
    title: "Edit profile & avatar",
    blobatarLabel: "Blobatar geometric avatar",
    blobatarMeta: "Seed: {seed} · Expression: {expression}",
    customizeAvatar: "Customize avatar",
    fieldName: "Display name",
    placeholderName: "e.g. Enjoy Engineer",
    fieldHandle: "Handle",
    placeholderHandle: "e.g. @enjoy-agents",
    fieldRole: "Role title",
    placeholderRole: "e.g. Agent Engineer",
    fieldEmail: "Email",
    fieldTimezone: "Timezone",
    fieldExpression: "Avatar expression",
    fieldCover: "Glass cover style",
    cancel: "Cancel",
    saveChanges: "Save changes"
  },

  cover: {
    change: "Change cover effect",
    glyphRain: { label: "Glyph Rain", desc: "Falling code particles with a glowing cursor sweep" },
    hexFloat: { label: "Hex Float", desc: "Tilted 3D hexagon floor tiles" },
    retroDither: { label: "Retro Dither", desc: "8-bit ordered-dither lens" },
    frost: { label: "Frost", desc: "Ice lens that melts under the cursor" }
  }
}

export type EnAccountPages = typeof enAccountPages
