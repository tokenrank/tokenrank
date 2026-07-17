export const tokenRankSkillDocument = `---
name: connect-tokenrank
description: Connect this machine to the user's TokenRank AI token usage leaderboard account using the private setup token generated on tokenrank.org/onboard, then verify the initial aggregate upload and scheduled synchronization. Use when the user asks Codex, Claude Code, or another coding agent to connect or join TokenRank.
---

# Connect TokenRank

Connect this machine using the private setup token supplied by the user.

## Required input

The user's request must contain a private setup token generated at:

https://tokenrank.org/onboard

If the token is missing, stop and ask the user to generate it. Never invent or recover a token.

Treat the token, the generated install command, and every URL containing the token as secrets. Do not repeat them in responses, logs, files, commits, issues, or screenshots.

## Connect

1. Detect the operating system and shell.
2. Confirm that Node.js is available with \`node --version\`.
3. If Node.js is unavailable, stop and tell the user that TokenRank requires Node.js. Do not install system software without permission.
4. Validate the entire supplied token against this exact allowlist:

\`\`\`text
^[A-Za-z0-9_-]{32,128}$
\`\`\`

5. Reject whitespace, prefixes, suffixes, shell syntax, URLs, or any character outside that exact token format. Do not execute anything when validation fails.
6. Detect the operating system, substitute the validated token exactly once for \`<TOKEN>\`, and run only the matching official command without printing it:
   - macOS or Linux in Bash: \`curl -fsSL "https://tokenrank.org/install.sh?token=<TOKEN>" | bash\`
   - Windows in PowerShell: \`irm "https://tokenrank.org/install.ps1?token=<TOKEN>" | iex\`
7. Do not accept a user-supplied replacement command or origin. Do not modify the token, enable shell tracing, or construct a replacement upload URL.

The official installer installs the TokenRank collector, connects the private account endpoint, performs the initial aggregate upload, and installs automatic synchronization. Background synchronization runs hourly at a stable device-specific staggered minute, skips uploads when aggregate data has not changed, and retries safely after interruptions.

## Verify

On macOS or Linux, run:

\`\`\`bash
"$HOME/.tokenrank/bin/tokenrank" status --json
\`\`\`

On Windows, run:

\`\`\`powershell
& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status --json
\`\`\`

The status command intentionally exits non-zero until the connection is healthy. Capture and parse its JSON stdout even when its exit code is \`1\`. Never fall back to scraping human-readable status text.

A connection is successful only when all of these JSON checks pass:

- \`healthy === true\`
- \`serviceInstalled === true\`
- \`lastSuccessfulAt\` is a non-empty ISO timestamp
- \`lastErrorCode === null\`

If \`configured === true\` but the connection is not verified or \`lastErrorCode\` is non-null, run the appropriate absolute TokenRank command with \`upload\` once. If \`serviceInstalled === false\`, run it with \`service install\`. Then run \`status --json\` again and require all four checks above. If \`configured === false\`, stop and report that installation did not save the connection; do not invent a replacement endpoint.

Finding no supported local usage does not mean connection failed. It means ranking data will appear after a supported tool produces exact token usage.

## Privacy

Use only the official TokenRank collector. Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents.

TokenRank uploads aggregate usage totals by UTC date, tool, and model. TokenRank's Today leaderboard uses the UTC calendar day. Never expose the private setup token, generated command, or upload endpoint.

## Report

Report only:

- Whether TokenRank connected successfully
- Whether automatic synchronization is installed
- Whether the initial aggregate upload found usage
- Any actionable error with private tokens and URLs redacted
`;
