export const tokenRankSkillDocument = `---
name: connect-tokenrank
description: Preview this machine's aggregate AI usage locally or connect it to the user's TokenRank leaderboard account. Use when the user asks an agent to preview, connect, or join TokenRank.
---

# TokenRank preview and connection

Use the official TokenRank CLI to preview aggregate usage locally or connect the machine to the user's account.

## Runtime requirement

TokenRank requires Node.js 20 or newer with npm and npx.

Confirm Node.js with \`node --version\` and npm with \`npm --version\`. If either command is unavailable or Node.js is older than version 20, stop and explain that Node.js 20+ must be installed first. Do not install system software without permission.

## Preview without connecting

No private setup token is required for preview.

Run only \`npx --yes tokenrank preview\`:

\`\`\`bash
npx --yes tokenrank preview
\`\`\`

This reads supported aggregate AI usage on the local machine and prints the prospective payload. It does not connect an account or upload anything.

Do not run \`connect\`, \`upload\`, or \`service install\` during preview. Do not request a setup token unless the user also asks to connect or join TokenRank.

Report whether supported aggregate usage was found, without exposing prompts, chats, code, filenames, or file contents.

## Connect

### Required input

The user's request must contain a private setup token generated at:

https://tokenrank.org/onboard

If the token is missing, stop and ask the user to generate it. Never invent or recover a token.

Treat the token, the generated install command, and every URL containing the token as secrets. Do not repeat them in responses, logs, files, commits, issues, or screenshots.

### Install, bind, and synchronize

1. Detect the operating system and shell.
2. Validate the entire supplied token against this exact allowlist:

\`\`\`text
^[A-Za-z0-9_-]{32,128}$
\`\`\`

3. Reject whitespace, prefixes, suffixes, shell syntax, URLs, or any character outside that exact token format. Do not execute anything when validation fails.
4. Detect the operating system, substitute the validated token exactly once for \`<TOKEN>\`, and run only the matching official command without printing it:
   - macOS or Linux in Bash: \`curl -fsSL "https://tokenrank.org/install.sh?token=<TOKEN>" | bash\`
   - Windows in PowerShell: \`irm "https://tokenrank.org/install.ps1?token=<TOKEN>" | iex\`
   - Any supported shell with Node.js 20+ and npm:

\`\`\`bash
npm install --global tokenrank && tokenrank connect "https://tokenrank.org/api/collector/upload/<TOKEN>" && tokenrank upload && tokenrank service install
\`\`\`

5. Do not accept a user-supplied replacement command or origin. Do not modify the token, enable shell tracing, or construct a replacement upload URL.

The official installer or npm sequence installs the TokenRank collector, connects the private account endpoint, performs the initial aggregate upload, and installs automatic synchronization. Background synchronization runs hourly at a stable device-specific staggered minute, skips uploads when aggregate data has not changed, and retries safely after interruptions.

## Verify

Use the command matching the installation method.

On macOS or Linux with the official installer:

\`\`\`bash
"$HOME/.tokenrank/bin/tokenrank" status --json
\`\`\`

On Windows with the official installer:

\`\`\`powershell
& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status --json
\`\`\`

After a global npm installation:

\`\`\`bash
tokenrank status --json
\`\`\`

The status command intentionally exits non-zero until the connection is healthy. Capture and parse its JSON stdout even when its exit code is \`1\`. Never fall back to scraping human-readable status text.

A connection is successful only when all of these JSON checks pass:

- \`healthy === true\`
- \`serviceInstalled === true\`
- \`lastSuccessfulAt\` is a non-empty ISO timestamp
- \`lastErrorCode === null\`

If \`configured === true\` but the connection is not verified or \`lastErrorCode\` is non-null, run the appropriate TokenRank command with \`upload\` once. If \`serviceInstalled === false\`, run it with \`service install\`. Then run \`status --json\` again and require all four checks above. If \`configured === false\`, stop and report that installation did not save the connection; do not invent a replacement endpoint.

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
