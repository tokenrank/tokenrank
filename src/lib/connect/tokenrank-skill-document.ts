export const tokenRankSkillDocument = `---
name: connect-tokenrank
description: Connect this machine to the user's TokenRank AI token usage leaderboard account using the private setup command generated on tokenrank.org/onboard, then verify the initial aggregate upload and scheduled synchronization. Use when the user asks Codex, Claude Code, or another coding agent to connect or join TokenRank.
---

# Connect TokenRank

Connect this machine using the private setup command supplied by the user.

## Required input

The user's request must contain a private setup command generated at:

https://tokenrank.org/onboard

If the command is missing, stop and ask the user to generate it. Never invent, recover, or request the raw token separately.

Treat the complete command and every URL inside it as secrets. Do not repeat them in responses, logs, files, commits, issues, or screenshots.

## Connect

1. Detect the operating system and shell.
2. Confirm that Node.js is available with \`node --version\`.
3. If Node.js is unavailable, stop and tell the user that TokenRank requires Node.js. Do not install system software without permission.
4. Validate that the supplied command downloads from \`https://tokenrank.org/install.sh\` or \`https://tokenrank.org/install.ps1\`. Do not execute commands from another hostname.
5. Run the supplied command in the matching shell:
   - Run the \`curl ... | bash\` command in Bash on macOS or Linux.
   - Run the \`irm ... | iex\` command in Windows PowerShell.
6. Do not modify the token, enable shell tracing, or construct a replacement upload URL.

The official installer installs the TokenRank collector, connects the private account endpoint, performs the initial aggregate upload, and installs automatic synchronization.

## Verify

On macOS or Linux, run:

\`\`\`bash
"$HOME/.tokenrank/bin/tokenrank" status
\`\`\`

On Windows, run:

\`\`\`powershell
& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status
\`\`\`

A successful connection reports that TokenRank is connected and that the background service is installed.

If the account is connected but the service is not installed, run the appropriate absolute TokenRank command with \`service install\`, then check \`status\` again.

Finding no supported local usage does not mean connection failed. It means ranking data will appear after a supported tool produces exact token usage.

## Privacy

Use only the official TokenRank collector. Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents.

TokenRank uploads aggregate usage totals by date, tool, and model. Never expose the private setup command or upload endpoint.

## Report

Report only:

- Whether TokenRank connected successfully
- Whether automatic synchronization is installed
- Whether the initial aggregate upload found usage
- Any actionable error with private tokens and URLs redacted
`;
