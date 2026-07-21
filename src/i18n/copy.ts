import { defaultLocale, type Locale } from "./config";

const en = {
  common: {
    brand: {
      name: "TokenRank",
      tagline: "AI token leaderboard",
      shortTagline: "Token usage ranking",
    },
    nav: {
      leaderboard: "Leaderboard",
      rules: "Rules",
      dashboard: "Dashboard",
      start: "Join",
      github: "GitHub",
      openDashboard: "Open {name}'s dashboard",
    },
    language: {
      label: "Language",
      english: "EN",
      chinese: "中文",
    },
    buttons: {
      dashboard: "Dashboard",
      onboard: "Onboard",
      rules: "Rules",
      start: "Join the board",
      viewPublic: "Public profile",
      refreshCommand: "New sync command",
      signOut: "Sign out",
      signingOut: "Signing out",
      shareToX: "Share on X",
      copied: "Copied",
      copy: "Copy",
    },
  },
  boards: {
    total: "Overall",
    cost: "Spend",
    codex: "Codex",
    "claude-code": "Claude Code",
    hermes: "Hermes",
    openclaw: "OpenClaw",
    cline: "Cline",
    opencode: "opencode",
    workbuddy: "WorkBuddy",
    gemini: "Gemini",
    zcode: "ZCode",
    kimi: "Kimi",
    "kilo-code": "Kilo Code",
    "codex-vps": "codex-vps",
    "roo-code": "Roo Code",
    qwen: "Qwen",
    "codex-cache": "codex-cache",
    cursor: "Cursor",
    "github-copilot": "GitHub Copilot",
    continue: "Continue",
  },
  ranges: {
    today: "Today · UTC",
    "3d": "3D",
    "7d": "7D",
    "30d": "30D",
    month: "Month",
  },
  home: {
    metaTitle: "AI Token Usage Leaderboard for Coding Agents | TokenRank",
    metaDescription:
      "Compare locally collected aggregate AI token usage across Codex, Claude Code, Gemini, Qwen, and more. Prompts, code, and chats stay local.",
    hero: {
      eyebrow: "AI token leaderboard",
      title: "BURN TOKENS.\nASCEND RANKS.",
      body: "Automatically track aggregate token usage across Codex, Claude Code, Gemini, Qwen, and more. Your prompts, code, chats, filenames, and file contents stay local.",
      signal: "An activity signal, not a productivity score.",
      primary: "Join the board",
      secondary: "View leaderboard",
    },
    stats: {
      leader: "Current leader",
      identity: "Public identity",
      scope: "Ranking scope",
      waitingScore: "No entries yet",
      waitingIdentity: "Waiting for the first builder",
      users: "{count} builders",
    },
    controls: {
      board: "Board",
      range: "Window",
    },
    share: {
      title: "Share the board",
      subtitle: "Ready for X.",
      post: "Post to X",
      copy: "Copy post",
      copied: "Copied",
      leader:
        "Watching TokenRank {range} {board}: {name} (@{handle}) leads with {score}. Who is actually putting AI tokens to work?",
      empty:
        "Watching TokenRank {range} {board}: the first spot is still open. Who is actually putting AI tokens to work?",
    },
    table: {
      emptyTitle: "No data yet",
      emptyBody:
        "The database is not configured locally, or this board has no entries yet. Connect once and aggregate token rows will appear here.",
      title: "Leaderboard",
      subtitle: "Sorted by the active window and board.",
      count: "{count} builders",
      rank: "Rank",
      identity: "X identity",
      spend: "Estimated spend",
      topTools: "Top tools",
      noTools: "-",
      tokenScore: "{board} tokens",
      spendScore: "Estimated spend",
      dataFeed: "Local aggregate / server checked",
    },
    answer: {
      title: "WHAT IS TOKENRANK",
      body: "TokenRank is a public AI token usage leaderboard. It compares aggregate usage from supported coding agents and AI tools while keeping prompts, source code, chats, filenames, and file contents off the server.",
    },
    trust: {
      eyebrow: "Trust boundary",
      title: "Know what each number proves",
      intro:
        "Current rankings use collector-reported local aggregates. TokenRank checks structure, account ownership, totals, and duplicate rows; it does not verify provider bills.",
      items: [
        {
          title: "X account linked",
          body: "OAuth confirms control of the public X identity shown on the board.",
        },
        {
          title: "Local aggregate",
          body: "The collector reports totals by day, tool, and model. Local data can still be changed by its owner.",
        },
        {
          title: "Server checked",
          body: "The server validates fields, recomputes totals, checks upload ownership, and prevents duplicate device rows.",
        },
      ],
      note: "Not Provider Verified · Estimated cost is not a bill · Activity is not productivity",
    },
    how: {
      eyebrow: "How it works",
      title: "From local usage to a public rank",
      steps: [
        {
          title: "Connect your identity",
          body: "Sign in with X so every public ranking has a clear owner.",
        },
        {
          title: "Collect aggregate totals",
          body: "The local collector reads supported tools and sends token totals by date, tool, and model—not your work.",
        },
        {
          title: "Compare on one board",
          body: "TokenRank validates the rows, applies the published rules, and ranks public profiles by window and tool.",
        },
      ],
    },
    faq: {
      eyebrow: "Common questions",
      title: "TokenRank FAQ",
      items: [
        {
          question: "What does TokenRank measure?",
          answer: "It measures aggregate input, output, cache, and total token activity reported by supported AI agents and tools. It does not measure skill, productivity, or work quality.",
        },
        {
          question: "Does TokenRank upload prompts or source code?",
          answer: "No. The collector excludes prompts, source code, chats, filenames, and file contents and uploads aggregate usage rows only.",
        },
        {
          question: "Is leaderboard data provider verified?",
          answer: "Not yet. Current data is collected or imported on the user's device and checked by the server for structure, ownership, totals, and duplicates. It is not verified against provider billing.",
        },
        {
          question: "Which AI tools can appear on the leaderboard?",
          answer: "The board supports Codex, Claude Code, Gemini, Qwen, Cursor, GitHub Copilot, and other agents listed in the board selector.",
        },
        {
          question: "How does TokenRank avoid duplicate usage?",
          answer: "A repeated upload for the same device, UTC date, tool, and model replaces the earlier row instead of adding a duplicate.",
        },
        {
          question: "How do I join the AI token leaderboard?",
          answer: "Open the onboarding flow, sign in with X, run the one-line collector command, and wait for the first aggregate upload.",
        },
      ],
    },
    explore: {
      eyebrow: "Related",
      title: "Explore TokenRank",
      links: [
        { href: "/rules", title: "Scoring and privacy rules", body: "See exactly what is counted, excluded, and protected." },
        { href: "/onboard", title: "Join the leaderboard", body: "Connect your identity and start automatic aggregate sync." },
        { href: "/llms.txt", title: "Machine-readable overview", body: "Read the concise product, endpoint, and privacy summary." },
      ],
    },
  },
  rules: {
    metaTitle: "AI Token Leaderboard Scoring Rules & Privacy",
    metaDescription:
      "Learn how TokenRank scores raw AI token totals, protects private work, prevents duplicate device usage, and handles suspicious leaderboard data.",
    hero: {
      eyebrow: "Rules",
      title: "Measure usage. Protect the work.",
      body: "TokenRank is a public leaderboard for collector-reported aggregate AI activity. It is an activity signal for comparison and sharing—not a provider audit or productivity score.",
      cta: "Join the board",
    },
    privacy: {
      title: "Privacy boundary",
      body: "TokenRank accepts collector-reported aggregate rows only: identity, tokens, tools, models, dates, and estimated cost. Your code stays off the wire.",
    },
    cards: [
      {
        title: "Only aggregate token rows",
        body: "The collector sends UTC date, tool, model, token counts, and estimated cost. It never uploads code, prompts, chats, filenames, or file contents.",
      },
      {
        title: "Main board uses raw tokens",
        body: "Codex uses provider raw input + output because its input already includes cached input. Claude Code and similar tools add input, output, cache reads, and cache writes.",
      },
      {
        title: "Server recomputes totals",
        body: "Collectors send aggregate fields, but the server recomputes total tokens from the raw fields before writing leaderboard rows.",
      },
      {
        title: "Same device, same day overwrites",
        body: "Repeated uploads from one device for the same UTC date, tool, and model replace the old row instead of stacking duplicate points.",
      },
      {
        title: "Top three devices count",
        body: "Each user only ranks with the three highest-usage devices in a leaderboard window, reducing the upside of fake devices.",
      },
      {
        title: "Suspicious rows can be removed",
        body: "The server validates tools, dates, integers, recomputed totals, webhook ownership, and duplicate keys. These checks do not turn local data into Provider Verified usage; suspicious records can be flagged, hidden, or removed.",
      },
      {
        title: "X sharing is user-controlled",
        body: "The MVP opens an X Web Intent. TokenRank does not auto-post and does not request posting permissions.",
      },
    ],
  },
  onboard: {
    metaTitle: "Join TokenRank",
    metaDescription:
      "Preview aggregate AI usage locally before signing in, then connect an X identity and start private collector sync.",
    hero: {
      eyebrow: "Onboarding",
      title: "Preview first. Claim your rank.",
      body: "See the aggregate activity found on this machine before creating an account. Nothing uploads until you choose to connect your public identity.",
    },
    preview: {
      eyebrow: "Stage 00 / private preview",
      title: "See your numbers before signing in",
      body: "Run the official CLI preview locally. It scans supported aggregate usage and prints the payload shape without connecting an account or uploading anything.",
      command: "npx --yes tokenrank preview",
      copy: "Copy preview command",
      copied: "Command copied",
      privacy: "No account · No upload · Prompts and code stay local",
      source: "View CLI source",
    },
    challenge: {
      eyebrow: "Challenge received",
      title: "@{handle} challenged your activity rank",
      rankedBody: "They are #{rank} on the 7-day overall board. Preview your local aggregate, then connect to enter the same board.",
      unrankedBody: "Preview your local aggregate, then connect to enter the 7-day overall board.",
    },
    signedIn: {
      title: "Signed in as {name}",
      body: "Your private upload endpoint can be generated below. Run the command once; the dashboard opens after a fresh upload.",
      dashboard: "Dashboard",
    },
    signIn: {
      title: "Claim your public rank with X",
      body: "After previewing, connect the X identity shown on the board. Login confirms identity only; it does not upload code, prompts, chats, or files.",
      statusLabel: "Sign-in status",
    },
    flowTitle: "Ranking flow",
    asideNote:
      "The private upload URL stays on this machine. TokenRank receives aggregate dates, tools, models, tokens, and estimated cost only.",
    steps: [
      {
        title: "Sign in with X",
        body: "Choose the public identity used on the board and share cards.",
      },
      {
        title: "Run one command",
        body: "Install the collector, bind the private endpoint, and upload once.",
      },
      {
        title: "Detect first upload",
        body: "This page polls for a new upload and opens the dashboard.",
      },
      {
        title: "Watch your record",
        body: "Dashboard shows heatmap, trends, client, tool, model, and row details.",
      },
    ],
    webhook: {
      title: "Choose how to connect",
      body: "Generate a private upload URL, then give the secure prompt to a trusted coding agent or run the platform command yourself. Either method installs the collector, uploads once, and schedules background sync.",
      generate: "Generate upload URL",
      generating: "Generating",
      errorFallback: "failed to create webhook token",
      methodLabel: "Connection method",
      methods: {
        agent: "Ask an agent",
        terminal: "Run in terminal",
      },
      agentTitle: "Connect with an agent",
      agentBody: "Copy this prompt to Codex, Claude Code, or another trusted coding agent.",
      agentCopyLabel: "Copy Agent prompt",
      agentSecurity: "This prompt contains your private setup token. Share it only with an agent you trust. Never post, screenshot, or commit it, and make sure the agent does not repeat it in its final response.",
      copyError: "Copy failed. Select the text and copy it manually.",
      platformLabel: "Setup platform",
      cards: [
        {
          title: "1. Identity is already linked",
          body: "The upload URL is bound to this X account. Another account cannot use it to claim your rank.",
        },
        {
          title: "2. Install and bind",
          body: "Use Terminal on macOS/Linux or PowerShell on Windows. The command installs tokenrank and stores the private URL locally.",
        },
        {
          title: "3. Keep sync scheduled",
          body: "The command uploads once now. Automatic sync then runs hourly at a device-specific staggered minute, skips unchanged data, and retries safely after interruptions.",
        },
      ],
      autoTitle: {
        windows: "Auto sync: run in Windows PowerShell",
        unix: "Auto sync: run in {target}",
      },
      autoBody: {
        windows: "Open PowerShell, paste the command, and it will install the scheduled task.",
        unix: "Open Terminal, paste the command, and it will install the background service.",
      },
      targetLabels: {
        unix: "macOS / Linux",
        windows: "Windows PowerShell",
      },
      oneLine: "1 line",
      manualTitle: "Manual refresh",
      manualBody:
        "Background sync handles hourly updates. Use this command only when you want an immediate refresh.",
      empty: "Click \"Generate upload URL\" first. Then choose an Agent prompt or a terminal command.",
      privacy:
        "Only aggregate token counts and estimated cost by date, tool, and model are uploaded. Code, prompts, chats, and file contents are excluded.",
    },
    redirect: {
      ready: "Fresh upload detected. Opening dashboard.",
      waiting: "Keep this page open. After the terminal command uploads successfully, TokenRank opens your dashboard automatically.",
    },
  },
  dashboard: {
    metaTitle: "Dashboard",
    metaDescription:
      "Review your TokenRank heatmap, trend, client mix, tool mix, model mix, row details, and privacy settings.",
    signedOut: {
      eyebrow: "Dashboard",
      title: "Sign in to see your record.",
      body: "Your dashboard is the private view of uploaded aggregate rows. Sign in and continue through onboarding if you have not joined yet.",
      onboard: "Preview before joining",
    },
    missing: {
      title: "Account data is not ready",
      body: "Sign in again, then reopen the dashboard.",
    },
    hero: {
      eyebrow: "Dashboard",
      title: "Your token record",
      body: "This is the result view: activity heatmap, daily trend, client, tool, model, and row-level aggregate details.",
    },
    empty: {
      title: "No uploads detected",
      body: "Return to onboarding and run the one-line command. When the terminal upload succeeds, this dashboard fills with your aggregate rows.",
      cta: "Start onboarding",
    },
    usage: {
      heroEyebrow: "Public record",
      heroBody:
        "Shareable aggregate AI token data by client, tool, model, day, and activity rhythm.",
      totalOverview: "Total overview",
      noClient: "No client data",
      mainClient: "Main client: {value}",
      mainTool: "Main tool: {value}",
      mainModel: "Main model: {value}",
      trustLabel: "Local aggregate / server checked",
      trustBody:
        "Collector-reported activity. TokenRank validates the upload but does not verify it against provider billing.",
      competition: {
        eyebrow: "7-day competition",
        title: "Rank context",
        rank: "7-day rank",
        unranked: "Not ranked",
        topPercent: "Top {percent}% of {count}",
        participants: "{count} ranked profiles",
        streak: "Active streak",
        streakValue: "{count} days",
        change: "7-day change",
        newActivity: "New activity",
        noBaseline: "No prior 7-day baseline",
        challenge: "Beat my rank",
        shareRanked:
          "I'm #{rank} on TokenRank's 7-day AI activity board, with a {streak}-day streak and {change} vs the prior week. Beat my rank: @{handle}",
        shareUnranked:
          "My aggregate AI activity is now on TokenRank, with a {streak}-day streak. Join the 7-day board and beat my rank: @{handle}",
      },
      stats: {
        total: "Total tokens",
        today: "Today · UTC",
        spend: "Estimated spend",
        activeDays: "Active days",
        clients: "Upload clients",
        mix: "Token mix",
        rows: "{count} uploaded rows",
        latestSync: "Last sync {value}",
        waitingSync: "Waiting for sync",
        latestDate: "Latest date {value}",
        noDate: "No date yet",
        activeAverage: "Active-day avg {value}",
        clientHint: "{label} {value}",
        noClient: "No client yet",
        notProvided: "Not provided",
        inputOutput: "Input / output",
        cache: "cache {value}",
        waitingBreakdown: "Waiting for input/output/cache detail",
      },
      heatmap: {
        title: "Upload activity",
        subtitle: "Last 32 weeks. Each mark is one day; {count} days contain uploads.",
        low: "Low",
        high: "High",
        month: "{month}",
      },
      trend: {
        title: "Daily token trend",
        subtitle: "Last {count} days across all upload clients, tools, and models.",
        latest: "Latest",
        peak: "Peak",
        noData: "No trend data",
        range: "Range: {start} - {end}",
        peakDate: "Peak date: {date}",
        noPeak: "none",
        delta: "Vs prior day: {value}",
        flat: "flat",
      },
      breakdown: {
        byClient: "By upload client",
        byTool: "By tool",
        byModel: "By model",
        top: "Top {count}",
        activeDays: "{count} active days",
        rows: "{count} rows",
        empty: "No distribution data",
      },
      table: {
        title: "Upload rows",
        subtitle: "Latest rows by date with client, tool, model, and token mix.",
        empty: "No daily rows yet",
        date: "Date",
        client: "Client",
        tool: "Tool",
        model: "Model",
        input: "Input",
        output: "Output",
        cache: "Cache",
        token: "Token",
        spend: "Spend",
        unknownClient: "Unknown client",
        clientPrefix: "Client",
        unknownModel: "Unattributed model",
      },
    },
    privacy: {
      title: "Public settings",
      body: "Control whether your profile is public and whether uploads count toward leaderboards. Turning these off keeps historical data, but changes public display and scoring.",
      save: "Save settings",
      saving: "Saving",
      saved: "Saved",
      errorFallback: "failed to save settings",
      profileTitle: "Public profile",
      profileBody: "Allow others to visit your public `/u/handle` stats page.",
      rankingTitle: "Leaderboard ranking",
      rankingBody: "Count eligible devices and daily aggregates in public board rankings.",
    },
  },
  auth: {
    metaTitle: "Sign in to TokenRank",
    metaDescription:
      "Sign in with X, generate a private upload URL, and start automatic AI token sync.",
    hero: {
      eyebrow: "Sign in",
      title: "Use X as your public rank identity.",
      body: "After login, TokenRank returns to onboarding so you can generate a private upload URL and run the sync command.",
    },
    security: {
      title: "Identity only. Work stays private.",
      body: "Login confirms the X profile shown on leaderboards. The collector still sends aggregate token rows only.",
    },
    nextTitle: "After sign in",
    steps: [
      {
        title: "Confirm identity",
        body: "The board, dashboard, and share card use your X name and handle.",
      },
      {
        title: "Generate upload URL",
        body: "The private webhook endpoint is only for your local collector.",
      },
      {
        title: "Open dashboard",
        body: "After sync, the dashboard shows your latest token aggregates.",
      },
    ],
    back: "Back to onboarding",
    button: {
      default: "Continue with X",
      pending: "Redirecting",
      canonical: "Open login on localhost",
    },
    guard: {
      missingDatabase:
        "This local preview is not connected to the account service, so X sign-in stays off here. The private CLI preview above still works without an account.",
      missingX: "X sign-in is unavailable in this preview because the X login service is not connected.",
      hostMismatch:
        "This page is {currentHost}, but the X OAuth callback is bound to {canonicalHost}. Start login from the same host so the browser returns the OAuth state cookie.",
    },
    errors: {
      oauth:
        "Sign-in did not finish. X returned to the callback, but OAuth state was missing or the server could not exchange the token. Start from localhost and try again.",
      callback:
        "Sign-in did not finish. X returned, but the server could not create the account session. Confirm DATABASE_URL and migrations.",
      fallback:
        "Sign-in did not finish. Try again, and confirm the current host matches the X OAuth callback host.",
    },
  },
} as const;

const zh = {
  common: {
    brand: {
      name: "TokenRank",
      tagline: "AI Token 排行榜",
      shortTagline: "Token 使用榜",
    },
    nav: {
      leaderboard: "榜单",
      rules: "规则",
      dashboard: "面板",
      start: "上榜",
      github: "GitHub",
      openDashboard: "打开 {name} 的面板",
    },
    language: {
      label: "语言",
      english: "EN",
      chinese: "中文",
    },
    buttons: {
      dashboard: "面板",
      onboard: "上榜流程",
      rules: "规则",
      start: "开始上榜",
      viewPublic: "公开页",
      refreshCommand: "重新生成同步命令",
      signOut: "退出",
      signingOut: "退出中",
      shareToX: "分享到 X",
      copied: "已复制",
      copy: "复制",
    },
  },
  boards: {
    total: "总榜",
    cost: "金额榜",
    codex: "Codex",
    "claude-code": "Claude Code",
    hermes: "Hermes",
    openclaw: "OpenClaw",
    cline: "Cline",
    opencode: "opencode",
    workbuddy: "WorkBuddy",
    gemini: "Gemini",
    zcode: "ZCode",
    kimi: "Kimi",
    "kilo-code": "Kilo Code",
    "codex-vps": "codex-vps",
    "roo-code": "Roo Code",
    qwen: "Qwen",
    "codex-cache": "codex-cache",
    cursor: "Cursor",
    "github-copilot": "GitHub Copilot",
    continue: "Continue",
  },
  ranges: {
    today: "今日 · UTC",
    "3d": "3 天",
    "7d": "7 天",
    "30d": "30 天",
    month: "本月",
  },
  home: {
    metaTitle: "AI Token 用量排行榜：Codex、Claude Code 等 | TokenRank",
    metaDescription:
      "比较 Codex、Claude Code、Gemini、Qwen 等 AI 工具在本机采集的聚合 Token 用量；prompt、代码和对话留在本机。",
    hero: {
      eyebrow: "AI Token 排行榜",
      title: "TOKEN 燃烧\nRANKING 狂飙",
      body: "自动汇总 Codex、Claude Code、Gemini、Qwen 等工具的 Token 用量。prompt、代码、对话、文件名和文件内容都留在本机。",
      signal: "这是 AI 活动信号，不是生产力评分。",
      primary: "开始上榜",
      secondary: "查看榜单",
    },
    stats: {
      leader: "当前第一",
      identity: "公开身份",
      scope: "排名口径",
      waitingScore: "等待上榜",
      waitingIdentity: "等待第一位用户",
      users: "{count} 位用户",
    },
    controls: {
      board: "榜单",
      range: "周期",
    },
    share: {
      title: "分享榜单",
      subtitle: "文案已备好，直接发 X。",
      post: "发到 X",
      copy: "复制文案",
      copied: "已复制",
      leader:
        "我正在看 TokenRank {range}{board}：{name}（@{handle}）以 {score} 暂列第一。谁把 AI Token 真用起来了？",
      empty:
        "我正在看 TokenRank {range}{board}：榜单正在等第一位上榜。谁把 AI Token 真用起来了？",
    },
    table: {
      emptyTitle: "暂无数据",
      emptyBody:
        "本地没有数据库配置，或当前榜单还没人上榜。完成连接后，聚合 Token 数据会出现在这里。",
      title: "公开排行榜",
      subtitle: "按当前周期和榜单口径排序。",
      count: "共 {count} 位用户",
      rank: "排名",
      identity: "X 身份",
      spend: "预估金额",
      topTools: "主要工具",
      noTools: "-",
      tokenScore: "{board} Token",
      spendScore: "预估金额",
      dataFeed: "本地聚合 / 服务端校验",
    },
    answer: {
      title: "TOKENRANK 是什么",
      body: "TokenRank 是公开的 AI Token 用量排行榜。它比较各类 Coding Agent 与 AI 工具的聚合用量，同时确保 prompt、源码、对话、文件名和文件内容不会上传到服务器。",
    },
    trust: {
      eyebrow: "可信度边界",
      title: "先看懂每个数字能证明什么",
      intro: "当前排名来自采集器上报的本地聚合数据。TokenRank 校验结构、账号归属、总量和重复行，但不会核对 Provider 账单。",
      items: [
        {
          title: "X 账号已连接",
          body: "OAuth 确认用户控制榜单展示的公开 X 身份。",
        },
        {
          title: "本地聚合",
          body: "采集器按日期、工具和模型上报总量；本机数据仍可能被其所有者修改。",
        },
        {
          title: "服务端校验",
          body: "服务端校验字段、重新计算总量、确认上传归属，并避免设备重复行。",
        },
      ],
      note: "不是 Provider Verified · 预估金额不是账单 · 活动不等于生产力",
    },
    how: {
      eyebrow: "运行方式",
      title: "从本地用量到公开排名",
      steps: [
        {
          title: "连接公开身份",
          body: "使用 X 登录，让每一条公开排名都有明确归属。",
        },
        {
          title: "采集聚合总量",
          body: "本地采集器读取支持的工具，只发送按日期、工具和模型汇总的 Token，不发送你的作品。",
        },
        {
          title: "按统一规则排名",
          body: "TokenRank 校验聚合行，应用公开规则，再按周期与工具生成公开排名。",
        },
      ],
    },
    faq: {
      eyebrow: "常见问题",
      title: "TokenRank FAQ",
      items: [
        {
          question: "TokenRank 统计什么？",
          answer: "它统计支持的 AI Agent 与工具上报的聚合 input、output、cache 和 total token 活动，不衡量能力、生产力或工作质量。",
        },
        {
          question: "TokenRank 会上传 prompt 或源码吗？",
          answer: "不会。采集器排除 prompt、源码、对话、文件名和文件内容，只上传聚合用量行。",
        },
        {
          question: "榜单数据经过 Provider 验证吗？",
          answer: "目前没有。数据由用户设备本地采集或导入，服务端会校验结构、归属、总量和重复行，但不会与 Provider 账单核对。",
        },
        {
          question: "哪些 AI 工具可以进入排行榜？",
          answer: "榜单支持 Codex、Claude Code、Gemini、Qwen、Cursor、GitHub Copilot，以及榜单选择器中列出的其他 Agent。",
        },
        {
          question: "TokenRank 如何避免重复计算？",
          answer: "同一设备、UTC 日期、工具和模型的重复上传会覆盖旧行，不会叠加成重复用量。",
        },
        {
          question: "如何加入 AI Token 排行榜？",
          answer: "打开上榜流程，使用 X 登录，运行一行采集命令，然后等待首次聚合上传完成。",
        },
      ],
    },
    explore: {
      eyebrow: "相关内容",
      title: "继续了解 TokenRank",
      links: [
        { href: "/rules", title: "计分与隐私规则", body: "查看统计、排除和隐私保护的准确口径。" },
        { href: "/onboard", title: "加入排行榜", body: "连接公开身份并开启自动聚合同步。" },
        { href: "/llms.txt", title: "机器可读简介", body: "读取精简的产品、接口和隐私边界说明。" },
      ],
    },
  },
  rules: {
    metaTitle: "AI Token 排行榜计分规则与隐私",
    metaDescription:
      "了解 TokenRank 如何计算 raw token、保护私有工作、避免重复设备用量，并处理可疑排行榜数据。",
    hero: {
      eyebrow: "规则",
      title: "记录用量，不暴露作品",
      body: "TokenRank 是采集器上报的 AI 聚合活动排行榜，用于对比和分享；它不是 Provider 审计，也不是生产力评分。",
      cta: "开始上榜",
    },
    privacy: {
      title: "隐私边界",
      body: "TokenRank 只接收采集器上报的聚合行：身份、Token、工具、模型、日期和预估金额。你的代码不会离开本机。",
    },
    cards: [
      {
        title: "只上传聚合 Token 行",
        body: "采集器只发送 UTC 日期、工具、模型、Token 数和预估金额；不上传代码、prompt、对话、文件名或文件内容。",
      },
      {
        title: "主榜使用 raw token",
        body: "Codex 使用 provider 原始 input + output，因为它的 input 已包含 cached input。Claude Code 等工具会把 input、output、cache read 和 cache write 全部计入。",
      },
      {
        title: "服务端重新计算 total",
        body: "采集器只发送聚合字段，服务端会按 raw 字段重新计算 total tokens 后再写入排行榜。",
      },
      {
        title: "同设备同日覆盖",
        body: "同一设备、同一 UTC 日期、同一工具和模型的重复上传会覆盖旧行，不会重复累加。",
      },
      {
        title: "最多计入三台设备",
        body: "每个榜单周期只计入单用户用量最高的三台设备，降低刷设备的收益。",
      },
      {
        title: "异常数据可移除",
        body: "服务端会校验工具、日期、整数、重算总量、webhook 归属和重复键。这些校验不会把本地数据变成 Provider Verified；可疑记录仍可被标记、隐藏或移除。",
      },
      {
        title: "X 分享由用户确认",
        body: "MVP 只打开 X Web Intent，不会替你自动发帖，也不请求发帖权限。",
      },
    ],
  },
  onboard: {
    metaTitle: "开始上榜",
    metaDescription:
      "登录前先在本机预览 AI 聚合用量，再连接 X 身份并开启私有采集器同步。",
    hero: {
      eyebrow: "上榜流程",
      title: "先看数据，再认领排名",
      body: "创建账号前，先看看这台设备能找到哪些聚合活动。只有你主动连接公开身份后，数据才会上传。",
    },
    preview: {
      eyebrow: "阶段 00 / 私密预览",
      title: "登录前先查看本机数据",
      body: "运行官方 CLI 的本地预览。它只扫描支持的聚合用量并打印待上传结构，不连接账号，也不会上传。",
      command: "npx --yes tokenrank preview",
      copy: "复制预览命令",
      copied: "命令已复制",
      privacy: "无需账号 · 不会上传 · prompt 与代码留在本机",
      source: "查看 CLI 源码",
    },
    challenge: {
      eyebrow: "收到挑战",
      title: "@{handle} 邀你挑战 AI 活动排名",
      rankedBody: "TA 当前位列 7 天总榜第 #{rank}。先预览你的本地聚合数据，再连接身份进入同一张榜。",
      unrankedBody: "先预览你的本地聚合数据，再连接身份进入 7 天总榜。",
    },
    signedIn: {
      title: "已登录：{name}",
      body: "下面可以生成你的私有上传地址。命令运行一次后，新的上传到达会自动打开面板。",
      dashboard: "面板",
    },
    signIn: {
      title: "用 X 认领你的公开排名",
      body: "预览后，连接排行榜展示的 X 身份。登录只确认身份，不上传代码、prompt、对话或文件。",
      statusLabel: "登录状态",
    },
    flowTitle: "上榜流程",
    asideNote:
      "私有上传地址只保存在本机。TokenRank 只接收日期、工具、模型、Token 和预估金额这些聚合统计。",
    steps: [
      {
        title: "登录 X",
        body: "确认榜单和分享卡展示哪个公开身份。",
      },
      {
        title: "运行一行命令",
        body: "安装采集器，绑定私有地址，并先上传一次。",
      },
      {
        title: "检测首次上传",
        body: "页面轮询新上传，成功后自动打开面板。",
      },
      {
        title: "查看战绩",
        body: "面板展示热力图、趋势、客户端、工具、模型和明细。",
      },
    ],
    webhook: {
      title: "选择接入方式",
      body: "生成私有上传地址后，可以把安全 Prompt 交给可信编码 Agent，或者自己运行对应系统的命令。两种方式都会安装采集器、立即上传一次并开启后台同步。",
      generate: "生成上传地址",
      generating: "生成中",
      errorFallback: "创建 webhook token 失败",
      methodLabel: "接入方式",
      methods: {
        agent: "交给 Agent",
        terminal: "使用命令行",
      },
      agentTitle: "让 Agent 帮你接入",
      agentBody: "把这段 Prompt 复制给 Codex、Claude Code 或其他你信任的编码 Agent。",
      agentCopyLabel: "复制 Agent Prompt",
      agentSecurity: "这段 Prompt 包含你的私有 setup token，只能交给可信 Agent。不要发布、截图或提交到仓库，并确保 Agent 不在最终回复中重复秘密。",
      copyError: "复制失败，请选中文本后手动复制。",
      platformLabel: "接入系统",
      cards: [
        {
          title: "1. 身份已经绑定",
          body: "上传地址绑定当前 X 账号，别人不能用自己的数据顶替你的排名。",
        },
        {
          title: "2. 安装并绑定",
          body: "macOS / Linux 用终端，Windows 用 PowerShell。命令会安装 tokenrank，并把私有地址保存在本机。",
        },
        {
          title: "3. 保持定时同步",
          body: "命令会先上传一次；之后每小时自动同步，并按设备分散到不同分钟。数据无变化时跳过上传，中断后会安全重试。",
        },
      ],
      autoTitle: {
        windows: "自动同步：在 Windows PowerShell 运行",
        unix: "自动同步：在 {target} 运行",
      },
      autoBody: {
        windows: "打开 PowerShell，粘贴命令；它会安装任务计划程序。",
        unix: "打开 Terminal / 终端，粘贴命令；它会安装后台同步服务。",
      },
      targetLabels: {
        unix: "macOS / Linux",
        windows: "Windows PowerShell",
      },
      oneLine: "1 行",
      manualTitle: "手动刷新",
      manualBody: "后台每小时同步会处理日常更新；只有想立刻刷新时才需要这条命令。",
      empty: "先点「生成上传地址」，然后选择复制 Agent Prompt 或终端命令。",
      privacy:
        "只上传按日期、工具、模型聚合后的 Token 数和预估金额；不上传代码、prompt、对话或文件内容。",
    },
    redirect: {
      ready: "检测到新上传，正在打开面板。",
      waiting: "保持这个页面打开。终端命令上传成功后，TokenRank 会自动打开你的面板。",
    },
  },
  dashboard: {
    metaTitle: "面板",
    metaDescription:
      "查看你的 TokenRank 热力图、趋势、客户端分布、工具分布、模型分布、上传明细和公开设置。",
    signedOut: {
      eyebrow: "面板",
      title: "登录后查看你的战绩",
      body: "面板是你的私有上传视图。还没上榜的话，登录后继续走同一套上榜流程。",
      onboard: "上榜前先预览",
    },
    missing: {
      title: "账号数据还没准备好",
      body: "重新登录后再打开面板。",
    },
    hero: {
      eyebrow: "面板",
      title: "你的 Token 战绩",
      body: "这里是结果页：活跃热力图、每日趋势、客户端、工具、模型和聚合明细都在这里。",
    },
    empty: {
      title: "还没有检测到上传",
      body: "回到上榜流程，运行一行命令。终端上传成功后，这里会显示你的聚合记录。",
      cta: "开始上榜",
    },
    usage: {
      heroEyebrow: "公开战绩",
      heroBody: "可分享的 AI Token 聚合数据，按客户端、工具、模型、日期和活跃节奏展示。",
      totalOverview: "上传数据总览",
      noClient: "暂无客户端数据",
      mainClient: "主要客户端：{value}",
      mainTool: "主要工具：{value}",
      mainModel: "主要模型：{value}",
      trustLabel: "本地聚合 / 服务端校验",
      trustBody: "采集器上报的活动数据。TokenRank 会校验上传，但不会与 Provider 账单核对。",
      competition: {
        eyebrow: "7 天竞技",
        title: "排名上下文",
        rank: "7 天排名",
        unranked: "本期未上榜",
        topPercent: "共 {count} 人，位于 Top {percent}%",
        participants: "{count} 个上榜账号",
        streak: "连续活跃",
        streakValue: "{count} 天",
        change: "近 7 天变化",
        newActivity: "新增活动",
        noBaseline: "前 7 天暂无基线",
        challenge: "挑战我的排名",
        shareRanked: "我在 TokenRank 的 7 天 AI 活动榜排名第 #{rank}，已连续活跃 {streak} 天，较前 7 天 {change}。来挑战我的排名：@{handle}",
        shareUnranked: "我的 AI 聚合活动已加入 TokenRank，连续活跃 {streak} 天。进入 7 天榜来挑战我：@{handle}",
      },
      stats: {
        total: "累计 Token",
        today: "今日 Token · UTC",
        spend: "预估金额",
        activeDays: "活跃天数",
        clients: "上传客户端",
        mix: "Token 构成",
        rows: "{count} 条上传明细",
        latestSync: "最近同步 {value}",
        waitingSync: "等待同步",
        latestDate: "最新日期 {value}",
        noDate: "暂无日期",
        activeAverage: "活跃日均 {value}",
        clientHint: "{label} {value}",
        noClient: "暂无客户端",
        notProvided: "未提供",
        inputOutput: "输入 / 输出",
        cache: "缓存 {value}",
        waitingBreakdown: "等待 input/output/cache 明细",
      },
      heatmap: {
        title: "上传活跃点阵",
        subtitle: "近 32 周，每个点代表一天，{count} 天有上传数据。",
        low: "少",
        high: "多",
        month: "{month}月",
      },
      trend: {
        title: "每日 Token 趋势",
        subtitle: "最近 {count} 天，按所有上传客户端、工具和模型汇总。",
        latest: "最新",
        peak: "峰值",
        noData: "暂无趋势数据",
        range: "范围：{start} - {end}",
        peakDate: "峰值日期：{date}",
        noPeak: "暂无",
        delta: "较前日：{value}",
        flat: "持平",
      },
      breakdown: {
        byClient: "按上传客户端",
        byTool: "按工具",
        byModel: "按模型",
        top: "Top {count}",
        activeDays: "{count} 天活跃",
        rows: "{count} 条明细",
        empty: "暂无分布数据",
      },
      table: {
        title: "上传明细",
        subtitle: "最近上传记录，按日期展示客户端、工具、模型和 Token 构成。",
        empty: "暂无每日明细",
        date: "日期",
        client: "客户端",
        tool: "工具",
        model: "模型",
        input: "Input",
        output: "Output",
        cache: "Cache",
        token: "Token",
        spend: "金额",
        unknownClient: "未知客户端",
        clientPrefix: "Client",
        unknownModel: "未识别模型",
      },
    },
    privacy: {
      title: "公开设置",
      body: "控制你的个人页是否公开，以及上传数据是否计入排行榜。关闭后不会删除历史数据，只影响公开展示和排名计算。",
      save: "保存设置",
      saving: "保存中",
      saved: "已保存",
      errorFallback: "保存设置失败",
      profileTitle: "公开个人页",
      profileBody: "开启后，其他人可以访问你的 `/u/handle` 公开统计页。",
      rankingTitle: "计入排行榜",
      rankingBody: "开启后，符合条件的设备和每日汇总会参与公开榜单排名。",
    },
  },
  auth: {
    metaTitle: "登录 TokenRank",
    metaDescription: "使用 X 登录，生成私有上传地址，并开启 AI Token 自动同步。",
    hero: {
      eyebrow: "登录",
      title: "用 X 作为你的公开排名身份",
      body: "登录完成后，TokenRank 会回到上榜流程，继续生成私有上传地址和同步命令。",
    },
    security: {
      title: "只确认身份，不触碰作品",
      body: "登录只用于确认排行榜展示的 X 资料。采集器仍然只上传聚合 Token 行。",
    },
    nextTitle: "登录后继续做什么",
    steps: [
      {
        title: "确认公开身份",
        body: "榜单、面板和分享卡会展示你的 X 名称与 handle。",
      },
      {
        title: "生成上传地址",
        body: "私有 webhook 地址只给本机采集器使用。",
      },
      {
        title: "打开面板",
        body: "自动同步后，面板会展示最新 Token 汇总。",
      },
    ],
    back: "返回上榜流程",
    button: {
      default: "使用 X 登录",
      pending: "正在跳转",
      canonical: "用 localhost 打开登录",
    },
    guard: {
      missingDatabase:
        "当前本地预览没有连接账号服务，因此这里暂不开放 X 登录；上方的私密 CLI 预览仍可直接使用，无需账号。",
      missingX: "当前预览没有连接 X 登录服务，因此暂时不能跳转到 X。",
      hostMismatch:
        "当前页面是 {currentHost}，但 X OAuth callback 绑定在 {canonicalHost}。请从同一个地址发起登录，否则浏览器不会带回 OAuth state cookie。",
    },
    errors: {
      oauth:
        "登录没有完成。X 授权已返回，但 OAuth state 没带回来，或服务端换 token / 拉资料超时；请从 localhost 发起登录后再重试。",
      callback:
        "登录没有完成。X 授权已返回，但服务端没能创建账号会话；请确认 DATABASE_URL 已配置并完成数据库迁移。",
      fallback:
        "登录没有完成。请重新尝试，并确认当前地址和 X OAuth callback 地址一致。",
    },
  },
} as const;

const dictionaries = { en, zh } as const;

export type AppCopy = typeof en;

export function getCopy(locale: Locale): AppCopy {
  return dictionaries[locale] as unknown as AppCopy;
}

export const defaultCopy = getCopy(defaultLocale);

export function text(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
