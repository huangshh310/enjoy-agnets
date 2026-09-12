/**
 * Skills hub (curated store / library / packs / agent armory) page catalog.
 */

export const enSkillsPages = {
  states: {
    curated: "Curated",
    noneActive: "No agent enabled",
    notMounted: "Not mounted",
    equipped: "Equipped"
  },

  hero: {
    spotlightBadge: "Official pick of the week",
    runtimeLabel: "Supported runtimes:",
    installedFull: "Fully equipped to AI",
    installAll: "Equip the full pack ({n} skills)",
    trendingTitle: "Trending skills",
    countItems: "{n} skills",
    installedShort: "Installed",
    get: "Get",
    syncHint: "Community packs synced weekly",
    offline: "100% offline"
  },

  toolbar: {
    driftBadge: "{n} need sync",
    readyBadge: "{n} skills ready",
    readyAll: "All ready",
    subtitle: "Equip your AI assistants with plug-and-play superpowers: code review, UI design, copywriting, and more.",
    searchPlaceholder: "Search skill names or triggers…",
    createSkill: "New skill",
    importSource: "Import sources",
    doctor: "Doctor diagnostics",
    tabCurated: "Curated store",
    tabAll: "All skills",
    tabPacks: "Skill packs"
  },

  importDialog: {
    needWorkspace: "Open a project workspace before installing to it",
    title: "Import skill sources",
    gitTitle: "Import from a Git repository",
    gitPlaceholder: "e.g. obra/superpowers or https://github.com/...",
    gitFetch: "Fetch & mount",
    localTitle: "Pick a local skills folder",
    localDesc: "Attach existing agent skills or a local dev workspace",
    pickFolder: "Choose folder",
    presetsTitle: "Official quick presets",
    installGlobal: "Install globally",
    installWorkspace: "Install to workspace"
  },

  armoryHeader: {
    activeBadge: "{n} skills activated",
    standbyBadge: "Standing by · not equipped",
    goToStore: "Browse curated skills",
    viewAll: "View all skills",
    protocolLabel: "Protocol",
    projectDirLabel: "Projection dir",
    tagsLabel: "Specialties"
  },

  emptyState: {
    titleNamed: "{agent} has no dedicated skills yet",
    titleGeneric: "No skill packs equipped yet",
    descNamed: "No skills are linked to {agent} yet. Visit the curated store to equip it, or enable existing skill groups for {agent} on the left.",
    descGeneric: "Skills give AI assistants plug-and-play superpowers in refactoring, full-stack testing, UI taste, and engineering automation.",
    exploreStore: "Explore the curated store",
    viewAllInstalled: "View all installed skills",
    pickFolder: "Choose a local skills folder"
  },

  card: {
    verified: "Verified",
    activatedAgents: "Enabled agents:",
    allUnselected: "All contained skills are unchecked",
    countPrefix: "",
    countSuffix: " professional skills",
    manage: "Manage"
  },

  gridCard: {
    countSkills: "{n} pro skills included",
    getNow: "Get now"
  },

  drawer: {
    closeDetail: "Close skill details",
    close: "Close",
    copiedTrigger: "Trigger copied",
    copyTrigger: "Copy trigger {trigger}",
    revealFile: "Reveal source file",
    delete: "Delete"
  },

  curatedView: {
    emptyCategory: "No curated packs in this category"
  },

  itemCard: {
    details: "Details →"
  },

  drawerBody: {
    targetsTitle: "Target agents",
    targetsHint: "Click a row to toggle the group projection",
    projected: "Projected with group",
    workspaceLabel: "Workspace:",
    instructionsTitle: "Instructions"
  },

  targets: {
    activeCount: "{enabled} / {total} targets active",
    synced: "Synced",
    notProjected: "No projection",
    workspaceBound: "Current workspace bindings:"
  },

  listPane: {
    listTitle: "Skills in this pack ({n})",
    selectedSummary: "{enabled} / {total} skills selected to sync to targets",
    filterAll: "All",
    filterEnabled: "Enabled ({n})",
    filterDisabled: "Disabled",
    searchPlaceholder: "Filter {n} skills by name or command…",
    noMatch: "No matching skills",
    toggleAria: "Toggle {name}",
    stateActive: "Active",
    stateDormant: "Dormant",
    deleteAria: "Delete skill",
    deleteTitle: "Remove this skill from disk"
  },

  docInspector: {
    copied: "Copied",
    userInvocable: "User-invocable"
  },

  previewPane: {
    title: "SKILL.md · live spec preview",
    liveCompile: "Live compile",
    copyTitle: "Copy generated SKILL.md",
    copied: "Copied",
    copy: "Copy"
  },

  createDialog: {
    fallbackDescription: "Short skill description",
    fallbackBody: "## Instructions\n\nWrite your agent rules here...",
    needWorkspace: "Open a project workspace before creating a workspace skill",
    title: "Create agent superpowers (Create Skill Studio)",
    subtitle: "Craft domain specs, context guidance, and triggers for your AI assistants — plug and play, auto-mounted",
    footerHint: "Specs are validated and synced to the target agent runtime after creation",
    cancel: "Cancel",
    create: "Create skill pack"
  },

  recommendedPacks: {
    title: "Skillsets tuned for {agent} (Recommended Skillsets)",
    plugHint: "Plug and play · no configuration needed",
    countSkills: "{n} domain skills",
    equippedTo: "Equipped to {agent}",
    linkTo: "Link to {agent} in one click",
    getAndEquip: "Get & equip"
  },

  quickMatrix: {
    title: "Quick-equip existing skills to {agent} (Armory Quick Matrix)",
    activeCount: "{enabled} / {total} source groups active",
    summary: "{sources} source groups with {skills} skills are connected. Click a source pill below to mount or unmount the whole group for {agent}.",
    quickMountLabel: "Quick-mount groups:",
    toggleTitle: "Click to {action} all {n} skills of this group for {agent}",
    mount: "mount",
    unmount: "unmount",
    searchPlaceholder: "Filter {n} installed skills…",
    exploreLabel: "Explore:",
    clear: "Clear",
    defaultDesc: "Provides task instructions and context",
    slotTitle: "Projection is per group: use the pills above to mount or unmount the whole group"
  }
}

export type EnSkillsPages = typeof enSkillsPages
