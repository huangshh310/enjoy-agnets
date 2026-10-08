/** Studio, customize, automations, window title bar. */
export const enStudio = {
  newChat: "New Chat",
  confirm: "Confirm",
  scanRefresh: "Rescan",
  copyCode: "Copy code",
  window: {
    brand: "enjoy AGENT IDE",
    minimize: "Minimize",
    minimizeWindow: "Minimize window",
    maximize: "Maximize",
    maximizeWindow: "Maximize window",
    restoreDown: "Restore down",
    restoreWindow: "Restore window",
    closeWindow: "Close window",
    history: "Page history",
    back: "Back",
    forward: "Forward",
    quitBusyTitle: "Sessions are still active",
    quitBusyDesc: "An assistant is still running, or a review is waiting. Quitting stops that work.",
    quitAnyway: "Quit"
  },
  header: {
    controlCenter: "Control Center & Capabilities",
    tabs: {
      overview: "Overview",
      grounding: "Data & Context",
      extensions: "Tools & Extensions",
      ops: "Workflows & Ops"
    }
  },
  hero: {
    title: "Agent Studio Control Center",
    localFirst: "Local-First Active",
    localFirstActive: "Local-First Ready",
    tagline:
      "Unified creation & orchestration hub. Manage workspace files, RAG knowledge, MCP plugins, workflows, and automated tasks.",
    description:
      "Unified creation & orchestration hub. Manage workspace files, RAG knowledge, MCP plugins, workflows, and automated tasks.",
    workspace: "Workspace",
    unnamedWorkspace: "No Workspace Opened",
    none: "None",
    knowledgeRag: "Knowledge RAG",
    ragSources: "Knowledge RAG",
    sourcesChunks: "{sources} Sources · {chunks} Chunks",
    mcpPlugins: "MCP Plugins",
    mcpStatus: "MCP Plugins",
    mcpActive: "{connected}/{total} Active · {tools} Tools",
    automations: "Automations",
    rulesRuns: "{rules} Rules · {runs} Runs",
    latestPerf: "Latest Duration"
  },
  assets: {
    title: "Assets & Knowledge",
    subtitle: "Workspaces, RAG vector index & multimodal media",
    noWorkspace: "No Workspace Opened",
    activeRoot: "Active Root",
    workspaceDesc: "Active workspace root. Files uses fs.watch in main; this is not a second Studio shell.",
    switchFolder: "Switch folder",
    copyPath: "Copy workspace path",
    nativeFs: "Native filesystem integration via Electron main",
    openInChat: "Open in Chat & Files",
    indexing: "Indexing",
    ready: "Ready",
    empty: "Empty",
    knowledgeTitle: "Knowledge Base (RAG)",
    knowledgeDesc: "Local retrieval. Vector search needs an embedding key; otherwise hashed or lexical matching.",
    sources: "Sources",
    chunks: "Chunks",
    manageKnowledge: "Manage knowledge",
    mediaTitle: "Media Studio & Multimodal Assets",
    assetCount: "{count} assets",
    mediaDesc: "Generate images, synthesize spoken audio, transcribe voice, and manage project media.",
    images: "Images",
    speech: "Speech (TTS)",
    video: "Video",
    exportHint: "Direct export to workspace with overwrite protection",
    openMedia: "Open Media Studio"
  },
  orch: {
    title: "Orchestration & Extensions",
    subtitle: "MCP plugins, durable execution pipelines & automations",
    mcpTitle: "MCP Plugins Hub & Tool Center",
    connected: "{connected}/{total} Connected",
    tools: "{count} tools",
    mcpDesc: "Model Context Protocol endpoints providing external tools and sandboxed UI Apps.",
    mcpEmpty: "No MCP servers registered. Click to connect filesystem, postgres, github, etc.",
    mcpFooter: "Processes isolated in main · UI Apps sandboxed in iframe",
    manageMcp: "Manage MCP servers",
    running: "{count} Running",
    runs: "{count} runs",
    workflowsTitle: "Durable Workflows",
    workflowsDesc: "Multi-step autonomous execution with durable checkpoints.",
    plan: "Plan",
    act: "Act",
    verify: "Verify",
    openWorkflows: "Open workflows",
    autoTitle: "Automations & Trigger Rules",
    activeRules: "{count} active rules",
    autoDesc: "Custom developer instructions triggered manually or automatically on file save.",
    onSaveTriggers: "On-Save Triggers",
    manualPrompts: "Manual Prompts",
    autoFooter: "Execute code audits, test suites, and commit notes automatically",
    configureAuto: "Configure automations"
  },
  insights: {
    title: "Config & Insights",
    subtitle: "Prompt customization & execution telemetry trace",
    rulesPersona: "Rules & Persona",
    customizeTitle: "Agent Customization",
    customizeDesc: "System prompt directives, rules file references, and subagent persona behavior.",
    customizeRules: "Customize prompt rules",
    customizeAgent: "Customize agent",
    logged: "{count} logged",
    obsTitle: "Observability & Telemetry",
    obsDesc: "Redacted execution traces, token throughput, TTFO latency & JSON export.",
    latest: "Latest: {ms}ms",
    ttfo: "TTFO: {ms}ms",
    otelOff: "OTEL disabled by default",
    viewMetrics: "View metrics & trace"
  },
  customize: {
    group: "Agent Customization",
    instructions: "Instructions",
    skillsHub: "Skills Hub",
    projectRules: "Project Rules",
    searchPlaceholder: "Search customization..."
  },
  instructions: {
    title: "Global System Instructions",
    badge: "System Prompt Context",
    desc: "Injected into Enjoy Local’s system prompt. For a local CLI they are prepended to this turn’s session/prompt. Glob-gated rules are not auto-injected.",
    presetsHint: "Common behavior presets (click to append):",
    clickToAppend: "Click to append",
    stats: "{chars} chars · {lines} lines",
    unsaved: "Unsaved changes",
    synced: "Synced",
    discard: "Discard changes",
    save: "Save instructions",
    placeholder:
      "e.g. Prefer precise local edits; avoid rewriting whole files. Keep files under 300 lines. Run verification commands before finishing.",
    helper: "Enjoy Local includes this text every turn. A local CLI only prepends it to the user prompt; the CLI still reads AGENTS.md from disk."
  },
  rules: {
    filterAll: "All rules",
    title: "Project Rules & Guidelines",
    badge: "Multi-Agent Standards",
    desc: "Scan AGENTS.md, CLAUDE.md, Cursor MDC, and similar files. Unglobbed or alwaysApply rules inject into Enjoy Local; glob-gated rules do not.",
    activeCount: "{count} injected into Enjoy Local",
    newRule: "New rule",
    searchPlaceholder: "Search rules or files...",
    emptyTitle: "No agent rule files found",
    emptyHint:
      "This workspace has no AGENTS.md, .cursor/rules/*.mdc, or CLAUDE.md yet. Write one from the templates below.",
    noMatch: "No matching rules",
    match: "Match:",
    revealTitle: "Reveal in file manager",
    reveal: "Reveal file",
    inspectTitle: "View rule details",
    inspect: "View content",
    deleteTitle: "Delete rule file",
    templatesTitle: "Popular rule templates · write into the project",
    templatesHint: "Click to write into .cursor/rules or AGENTS.md",
    writeMdc: "Write Cursor MDC",
    writeAgents: "Write AGENTS.md",
    copyContent: "Copy content",
    createTitle: "New agent rule file",
    createDesc: "Write a rule for the selected agent standard. The agent will follow it while coding.",
    targetKind: "Target agent standard",
    nameLabel: "Rule name",
    namePlaceholder: "e.g. clean-diffs, test-coverage",
    globsLabel: "Path globs",
    globsPlaceholder: "e.g. *.ts,*.tsx or src/**/*.py",
    descLabel: "Description",
    descPlaceholder: "e.g. Code change and atomic commit conventions",
    bodyLabel: "Rule body (Markdown)",
    bodyPlaceholder: "- Prefer precise local edits; avoid rewriting whole files.",
    writeRule: "Write rule",
    defaultContent: "# {name}\n- Rule instructions here."
  },
  skills: {
    title: "Agent Skills Hub & Capability Packs",
    badge: "Auto-Discovered",
    desc: "Scan global (~/.enjoy-agents/skills) and workspace SKILL.md packs on this machine.",
    installedCount: "{count} installed",
    scopeCounts: "{global} global · {workspace} workspace",
    newSkill: "New skill",
    installedHeading: "Installed skills ({count})",
    searchPlaceholder: "Search skill name or path...",
    emptyTitle: "No installed skill packs found",
    emptyHint:
      "No SKILL.md in ~/.enjoy-agents/skills/ or the current workspace. Install one from the featured templates below.",
    noMatch: "No matching skills",
    fallbackDesc: "Includes automation flow and skill notes",
    revealTitle: "Open in file manager",
    reveal: "Open folder",
    inspectTitle: "View SKILL.md details",
    inspect: "View spec",
    deleteTitle: "Delete skill",
    templatesTitle: "Featured skill templates · one-click install",
    templatesHint: "Write directly to global or workspace",
    installed: "Installed",
    command: "Command:",
    viewTemplate: "View template spec",
    installGlobal: "Install globally",
    installWorkspace: "Install in project",
    inspectName: "{name} · SKILL.md",
    templateSpec: "Template spec",
    createTitle: "New agent skill pack",
    createDesc: "Generate a standard SKILL.md scaffold locally. The agent will pick it up automatically.",
    nameLabel: "Skill name",
    namePlaceholder: "e.g. api-doc-writer, git-rebase-flow",
    descLabel: "Description",
    descPlaceholder: "e.g. Draft API specs and generate examples",
    scopeLabel: "Scope",
    scopeGlobal: "Global",
    scopeWorkspace: "Workspace",
    create: "Create skill pack"
  },
  automations: {
    title: "Automations",
    desc: "A save or a local POST opens one round. Closing the app pauses it.",
    newAutomation: "New",
    editTitle: "Edit automation",
    createTitle: "New automation",
    workspaceHint: "Current workspace · existing Composer",
    nameLabel: "Name",
    namePlaceholder: "e.g. Morning typecheck",
    trigger: "Trigger",
    manual: "Manual",
    cron: "cron",
    onSave: "On save",
    webhook: "webhook",
    triggerHint: "On save and webhook are live. Manual / cron stay clickable.",
    cronLabel: "Cron",
    timeZone: "Time zone",
    webhookPort: "Port",
    webhookPath: "Path",
    webhookSecret: "Secret",
    webhookSecretOptional: "optional",
    webhookListenHint: "Listen on 127.0.0.1:{port} · not public / no cloud relay",
    onSaveHint: "A workspace file save opens one round · local only · quitting pauses it",
    onSaveNoRun: "Fires after a save · no Run now",
    webhookNoRun: "Fires on a local POST · no Run now",
    webhookLocalOnly: "webhook 仅本机端口，非公网",
    engine: "Engine",
    modelLabel: "Model",
    modelOptional: "optional",
    modelPlaceholder: "Empty uses the engine's current model",
    mode: "Mode · C1",
    promptLabel: "Prompt template",
    promptPlaceholder: "The one-round instruction to send when this fires…",
    save: "Save",
    runNow: "Run now",
    running: "Running",
    cronNoRun: "cron fires on the clock · no Run now",
    localOnly: "仅在本机运行，关闭应用则暂停",
    emptyTitle: "No automations yet",
    emptyHint: "Create a manual, cron, on-save, or webhook rule.",
    neverRun: "Never run",
    lastRun: "Last · {when}",
    roundOpened: "Round opened · visible in the session list",
    statusIdle: "Idle",
    statusRunning: "Running",
    statusFailed: "Failed",
    runningBar: "Opening a local round · {engine} · {mode}",
    failedBar: "Open Inbox Failed · not Needs review",
    disableAria: "Turn automation off",
    enableAria: "Turn automation on"
  },
  instructionPresets: {
    minimalDiffs: {
      label: "Surgical minimal diffs",
      tag: "Minimal Diffs",
      text: "Prefer precise local edits; avoid rewriting whole files. Do not add comments that merely restate the code. Run typecheck and verification commands before declaring the task done."
    },
    tddFirst: {
      label: "Test-driven development (TDD)",
      tag: "Test-Driven",
      text: "Before changing core business logic, check or add tests. Run the suite and keep a zero-regression bar. Report the verification commands and coverage in the output."
    },
    cleanArch: {
      label: "High cohesion, low coupling",
      tag: "Architecture",
      text: "Follow modular layered design (anti-spaghetti). Keep files under 300 lines. Enforce Zod at IPC and API boundaries. Never use untyped any."
    },
    seniorPmUx: {
      label: "Product experience & UI",
      tag: "Product & UI",
      text: "Review features as a senior AI PM and UI designer. Favor smooth flows, restrained hierarchy, and semantic design tokens. Reject rough collage."
    }
  },
  curatedSkills: {
    webSearch: {
      name: "Web Search & Fact Synthesis",
      category: "Research & citations",
      badge: "Toolchain",
      description: "Multi-round keyword search, deep page extraction, and structured reports with real citations.",
      slashCommand: "/research <topic>",
      template:
        "---\nname: web-search-researcher\ndescription: Multi-step web search, deep page extraction, and cited fact reports\n---\n# Web Search & Fact Synthesis Skill\nWhen the user needs live external information or third-party library docs:\n1. Use search_web with 2-3 precise queries.\n2. Open official docs and extract core specs and API signatures.\n3. Produce an objective summary with clickable Markdown links."
    },
    generativeUi: {
      name: "Generative UI & Rich Widgets",
      category: "Frontend visualization",
      badge: "Interactive UI",
      description: "Render interactive React/HTML components, charts, SVG diagrams, and responsive form cards in the chat stream.",
      slashCommand: "/chart or /ui <spec>",
      template:
        "---\nname: generative-ui-designer\ndescription: Render interactive charts and rich components in a streaming session\n---\n# Generative UI Skill\nWhen you need to visualize data or an interactive UI:\n1. Prefer BoardUI semantic token colors.\n2. Output self-contained, sandbox-safe interactive components.\n3. Keep layouts responsive across resolutions."
    },
    tddSynth: {
      name: "TDD & Test Suite Synthesizer",
      category: "Quality",
      badge: "Testing",
      description: "Analyze edge cases and error branches, then synthesize unit, assertion, and regression tests.",
      slashCommand: "/test <file>",
      template:
        "---\nname: tdd-test-synthesizer\ndescription: Synthesize high-coverage unit tests and boundary assertions\n---\n# TDD Test Synthesizer Skill\nWhen writing or extending tests:\n1. Inspect the target function signature, branches, and edge errors.\n2. Write decoupled cases (happy path, boundaries, thrown errors).\n3. Run the suite and keep it fully green."
    },
    securityAudit: {
      name: "Security Audit & SAST Scanner",
      category: "Security & compliance",
      badge: "Security",
      description: "Scan the repo for OWASP issues, hardcoded credentials, unsafe command interpolation, and dependency CVEs.",
      slashCommand: "/audit <path>",
      template:
        "---\nname: security-audit-scanner\ndescription: Static security audit of the codebase with patch suggestions\n---\n# Security Audit Scanner Skill\nWhen auditing code:\n1. Hunt unsanitized input, command injection, and leaked keys.\n2. Output a structured risk matrix (high / medium / low).\n3. Provide security refactors as apply-ready diffs."
    }
  },
  projectRules: {
    cleanDiffs: {
      title: "Clean Code & Surgical Diffs",
      category: "Clean code",
      badge: "High Priority",
      description: "Force small atomic edits, zero leftover code, files under 300 lines.",
      content:
        "# Clean Code & Surgical Diffs Rule\n- Prefer precise local edits; avoid rewriting whole files.\n- Keep files strictly under 300 lines; extract modules when they grow.\n- Keep existing comments and docs; do not add lines that merely restate code.\n- Do not introduce unformatted code or extra debug logs."
    },
    strictTsZod: {
      title: "Strict TypeScript & Zod Schemas",
      category: "Type safety",
      badge: "Contract",
      description: "No any casts, strict null checks, Zod runtime parse at IPC and API boundaries.",
      content:
        "# Strict TypeScript & Zod Rule\n- Do not use any or untyped casts; define explicit TypeScript interfaces.\n- All IPC inputs and outputs must pass a Zod schema at runtime.\n- Keep types and constants in *.types.ts and constants.ts, not mixed into components."
    },
    boarduiTokens: {
      title: "BoardUI Semantic Design Tokens",
      category: "Visual system",
      badge: "UI Standard",
      description: "No hardcoded hex or arbitrary grays. Use BoardUI semantic tokens and Remixicon.",
      content:
        "# BoardUI Semantic Design Tokens Rule\n- Do not hardcode hex colors (#fff) or non-semantic grays (gray-500).\n- Use BoardUI semantic tokens: bg-background-primary-default, text-text-primary, accent-500.\n- Import icons from '@remixicon/react'."
    },
    tddVerification: {
      title: "Test-First Verification Gate",
      category: "Verification gate",
      badge: "Quality Gate",
      description: "Run automated verification (tests, typecheck) before declaring the task done.",
      content:
        "# Test-First Verification Gate Rule\n- Before reporting done, run 'pnpm typecheck' and relevant unit tests.\n- Fix type errors or test failures immediately.\n- Clearly report verification results in the final reply."
    }
  },
  automationTemplates: {
    diffs: {
      name: "Review Git Diffs on Save",
      category: "Code Quality",
      prompt:
        "Inspect the latest uncommitted changes in the workspace whenever files are saved and summarize risk, security concerns, and potential regressions.",
      badge: "Continuous Review"
    },
    todos: {
      name: "Scan TODOs & Security Smells",
      category: "Debt Tracker",
      prompt:
        "Scan recently edited files for TODO, FIXME, or HACK comments and security anti-patterns, generating an actionable summary.",
      badge: "Auto Audit"
    },
    typecheck: {
      name: "Typecheck & Linter Fixer",
      category: "Diagnostics",
      prompt:
        "Run project typecheck, identify all type mismatches or syntax anomalies, and provide ready-to-apply patch diffs.",
      badge: "One-Click Diagnostic"
    },
    commitNotes: {
      name: "Conventional Commit Notes",
      category: "VCS & Release",
      prompt:
        "Summarize recent uncommitted changes into structured Conventional Commits notes formatted for changelogs.",
      badge: "Smart Changelog"
    }
  }
}
