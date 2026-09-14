/**
 * Skills hub (curated store / library / packs / agent armory) page catalog.
 */

export const enSkillsPages = {
  states: {
    curated: "Curated",
    noneActive: "Not on host catalog",
    notMounted: "Not imported",
    equipped: "Equipped",
    healthOk: "Healthy",
    healthDrift: "Drifted",
    healthMissing: "Missing",
    healthError: "Error"
  },

  uiCopy: {
    moduleTitle: "Skills",
    moduleDesc: "Agent Skills Hub: Skills are installed into the host catalog; the current engine consumes this copy.",
    allSources: "All source groups",
    exploreCurated: "Explore curated",
    targetFilter: "Filter by target agent",
    mySources: "My skill groups",
    sourcesCount: "Source groups",
    deployedCount: "Installed skills",
    driftCount: "State drift",
    healthyState: "Healthy state",
    repairAll: "Repair all targets",
    updateAll: "Update skills",
    updating: "Updating…",
    syncAll: "Sync all",
    importSource: "Import skill group",
    doctorTitle: "Doctor diagnostics & self-healing",
    doctorDesc: "Compares authoritative state (manifest/lock) against disk targets, detecting missing files, modification drifts, and config conflicts.",
    noIssues: "All skill packages are intact and consistent. No state drifts or corruption detected.",
    emptySkillDesc: "Provides specialized prompts and execution guidelines",
    emptyTitle: "No skill workflows added yet",
    emptyDesc: "Paste an open-source repository URL to import quickly, or install popular agent skill packages from curated recommendations below.",
    quickGitPlaceholder: "Enter GitHub shorthand (e.g. obra/superpowers, garrytan/gstack) or HTTPS URL",
    addGitBtn: "Quick pull",
    pickFolderBtn: "Choose local skill directory",
    featuredTitle: "Curated community workflow libraries",
    featuredSubtitle: "High-scoring open-source skillsets by global developers and institutions, click to experience:",
    oneClickInstall: "One-click import",
    installedTag: "Added",
    backToList: "Back to source list",
    targetDeployments: "Host skill catalog",
    targetDeploymentsDesc: "The current engine only reads the host catalog; no longer copying to individual home directories.",
    skillsListTitle: "Contained skills list",
    skillsListDesc: "Check to enable or disable deployment projection for specific skills:",
    skillDocTitle: "SKILL.md document inspection",
    selectSkillHint: "Click any skill in the list on the left to view its detailed descriptions and commands",
    copyDefinition: "Copy definition",
    revealFolder: "Reveal in file manager",
    redeploySource: "Redeploy",
    pullUpdates: "Pull latest updates",
    removeSource: "Remove source group",
    deleteSkill: "Delete skill",
    confirmRemoveTitle: "Confirm removing this skill group?",
    confirmRemoveDesc: "Git sources will deregister records and delete projection copies, without deleting remote repositories. Local agent directories are only hidden from the list while keeping skill files.",
    confirmDeleteSkillTitle: "Confirm deleting this skill?",
    confirmDeleteSkillDesc: "This will delete the skill package from your local disk. This operation cannot be undone.",
    confirmDeployTitle: "Redeploy this skill group?",
    confirmDeployDesc: "This will overwrite and project selected skills into the host catalog (Enjoy and workspace .agents/skills).",
    importDialogTitle: "Import",
    gitLabel: "Git HTTPS",
    gitPlaceholder: "owner/repo or https://github.com/…",
    gitAdd: "Add Git",
    templates: "Curated templates",
    createCustom: "Create skill"
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
    descNamed: "This assistant consumes the host skill catalog. Equip packs from the store, or import skills already on disk.",
    descGeneric: "Skills give AI assistants plug-and-play superpowers in refactoring, full-stack testing, UI taste, and engineering automation.",
    exploreStore: "Explore the curated store",
    viewAllInstalled: "View all installed skills",
    pickFolder: "Choose a local skills folder"
  },

  card: {
    verified: "Verified",
    activatedAgents: "Host catalog:",
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
    hostHint: "Project into the host catalog; the current engine reads this copy",
    projected: "Projected with group",
    workspaceLabel: "Workspace:",
    instructionsTitle: "Instructions"
  },

  targets: {
    activeCount: "{enabled} / {total} targets active",
    synced: "Synced",
    notProjected: "No projection",
    hostDesc: "The current engine reads the host catalog. Skills are not copied into ~/.claude and similar folders.",
    hostOn: "On host catalog",
    hostOff: "Not equipped",
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
    equippedTo: "On host catalog",
    linkTo: "Import into host catalog",
    getAndEquip: "Get & import to host"
  },

  quickMatrix: {
    title: "Import existing skills into the host catalog ({agent} reads this copy)",
    activeCount: "{enabled} / {total} source groups on host",
    summary: "{sources} source groups with {skills} skills are connected. Click a source pill to import or remove the whole group from the host catalog. The current engine reads that copy.",
    quickMountLabel: "Import to host catalog:",
    toggleTitle: "Click to {action} all {n} skills of this group on the host catalog",
    mount: "import",
    unmount: "remove",
    searchPlaceholder: "Filter {n} installed skills…",
    exploreLabel: "Explore:",
    clear: "Clear",
    defaultDesc: "Provides task instructions and context",
    slotTitle: "Projection is per group: use the pills above to import or remove the whole group"
  }
}

export type EnSkillsPages = typeof enSkillsPages
