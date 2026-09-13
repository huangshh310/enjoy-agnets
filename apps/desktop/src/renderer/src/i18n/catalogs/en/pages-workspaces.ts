/**
 * Workspaces / create project / Blobatar avatar page catalog.
 */

export const enWorkspacesPages = {
  list: {
    navAll: "All projects & folders",
    pageTitle: "Local project workspaces",
    activeBadge: "Active",
    currentMount: "Mounted: ",
    openFolder: "Open folder",
    searchPlaceholder: "Search folder names or local paths...",
    colName: "Project",
    colPath: "Local path",
    colBranch: "Git branch",
    colSessions: "Sessions",
    colActions: "Status & actions",
    sessionCount: "{n} chats",
    currentActive: "Currently active",
    switchTo: "Switch to this workspace",
    shellSearchPlaceholder: "Search workspaces and folder paths...",
    crumbTitle: "Workspaces > Folders & projects"
  },

  createProject: {
    typeLabel: "Project type",
    localTitle: "Local",
    localDesc: "Edit, run, and test files directly on your machine",
    remoteTitle: "Remote",
    comingSoon: "Coming soon",
    remoteDesc: "Connect to an existing folder over SSH; files and CLIs stay on that machine",
    remotePathHint: "Browse or type an existing remote directory. This does not create an empty repo.",
    pickHost: "Choose a saved host",
    newHost: "New host…",
    connect: "Connect",
    testHost: "Test connection",
    probeOk: "Connection ok",
    browseRemote: "Browse",
    useRemoteDir: "Use this folder",
    remoteEmptyDir: "No subfolders",
    cancel: "Cancel",
    next: "Next",
    pickFirst: "Select a source folder first",
    defaultSessionName: "New chat",
    createFailed: "Failed to create project",
    title: "Create project",
    step1Desc: "Choose where the project is stored and runs",
    step2Desc: "Configure the source path and workspace name",
    nameLabel: "Project name",
    namePlaceholder: "e.g. enjoy-agents",
    folderLabel: "Source folder",
    folderPicked: "Source folder selected",
    changeFolder: "Click to change folder",
    folderHint: "Add a folder Enjoy can read and edit",
    browseHint: "Click to browse local folders...",
    back: "Back",
    create: "Create project"
  },

  avatar: {
    seedLabel: "Seed: ",
    seedNameLabel: "Seed name (drives the facial geometry hash)",
    random: "Randomize",
    seedPlaceholder: "Name, email, or handle…",
    expressions: "Expressions ({n})",
    toneLabel: "Color presets",
    hueLabel: "Hue",
    backdropLabel: "Backdrop shape",
    animateLabel: "Animation",
    backdrop: { none: "None", circle: "Circle", squircle: "Squircle", square: "Square" },
    animate: { always: "Always breathe", hover: "Hover only", off: "Static" }
  }
}

export type EnWorkspacesPages = typeof enWorkspacesPages
