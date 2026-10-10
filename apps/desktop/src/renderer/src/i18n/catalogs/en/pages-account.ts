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
    title: "Keys on this computer",
    vaultProtected: "Key is in the system keychain",
    vaultNeutral: "Keys stay on this computer",
    vaultEmpty: "No key stored",
    vaultTitle: "Encrypted on this device",
    vaultDesc: "Keys stay on this machine. This page only shows whether one is saved, never the secret itself.",
    endpointLabel: "This computer",
    currentDevice: "This computer",
    thisComputer: "This computer · {os}",
    thisComputerOnly: "This computer"
  },

  hero: {
    share: "Share",
    copied: "Copied",
    edit: "Edit",
    avatarHint: "Click to customize your avatar",
    contributions: "About this year",
    yearSpend: "About {amount} this year",
    lifetimeTokens: "Lifetime use",
    peakTokens: "Peak use",
    longestTask: "Longest task",
    topStreak: "Longest streak",
    peakHint: "Highest in one turn",
    streakHint: "Days in a row with activity",
    spendHint: "Estimate from local records",
    tokensHint: "All chat usage so far",
    agentsHint: "Assistant runs",
    longestHint: "Longest single task"
  },

  heatmap: {
    activity: "Activity",
    count: "{n}×",
    tooltip: "{date}: {n} activities",
    periodHintSuffix: "of activity",
    weekly: "Week",
    monthly: "Month",
    yearly: "Year",
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
