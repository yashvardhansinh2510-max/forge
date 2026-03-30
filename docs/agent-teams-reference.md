# Agent Teams — Master Reference Guide

> Comprehensive reference for building effective multi-agent systems in Claude Code.
> Source: https://code.claude.com/docs/en/agent-teams
> Last updated: March 2026

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [When to Use Agent Teams vs Alternatives](#when-to-use-agent-teams-vs-alternatives)
3. [Architecture](#architecture)
4. [Setup & Configuration](#setup--configuration)
5. [Display Modes](#display-modes)
6. [Controlling the Team](#controlling-the-team)
7. [Task Management](#task-management)
8. [Communication Patterns](#communication-patterns)
9. [Quality Gates with Hooks](#quality-gates-with-hooks)
10. [Subagents Reference](#subagents-reference)
11. [Best Practices](#best-practices)
12. [Use Case Patterns](#use-case-patterns)
13. [Troubleshooting](#troubleshooting)
14. [Known Limitations](#known-limitations)
15. [File Locations](#file-locations)

---

## Prerequisites

- Claude Code **v2.1.32 or later** (`claude --version`)
- Feature flag must be enabled (see [Setup](#setup--configuration))
- For split-pane mode: `tmux` or iTerm2 with `it2` CLI

---

## When to Use Agent Teams vs Alternatives

### Decision Matrix

| Scenario | Use |
|---|---|
| Parallel exploration of independent problems | **Agent Teams** |
| Workers need to talk to each other | **Agent Teams** |
| Complex multi-domain coordination | **Agent Teams** |
| Quick focused task, only result matters | **Subagents** |
| Sequential tasks or many dependencies | **Single session** |
| Same-file edits | **Single session** |
| Manual parallelism you control yourself | **Git worktrees** |

### Agent Teams vs Subagents

| | Subagents | Agent Teams |
|---|---|---|
| **Context** | Own window; results return to caller | Own window; fully independent |
| **Communication** | Report back to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work requiring discussion and collaboration |
| **Token cost** | Lower (results summarized back) | Higher (each teammate is a separate Claude instance) |

**Key distinction**: Subagents only report upward. Teammates communicate laterally.

### Strongest Use Cases for Agent Teams

1. **Research and review** — multiple teammates investigate different aspects simultaneously, then challenge each other's findings
2. **New modules/features** — teammates each own a separate piece without stepping on each other
3. **Debugging with competing hypotheses** — teammates test different theories in parallel and converge faster
4. **Cross-layer coordination** — changes spanning frontend, backend, and tests, each owned by a different teammate

---

## Architecture

```
Team Lead (your main Claude Code session)
├── Creates the team
├── Spawns teammates
├── Coordinates work via Task List
├── Synthesizes results
└── Runs cleanup

Teammates (separate Claude Code instances)
├── Each has own context window
├── Load same project context (CLAUDE.md, MCP, skills)
├── Receive spawn prompt from lead
├── Do NOT inherit lead's conversation history
├── Can message each other directly
└── Self-claim tasks from shared task list

Shared Task List
├── Tasks have 3 states: pending → in progress → completed
├── Tasks can have dependencies (blocked until dependency done)
├── File locking prevents race conditions on simultaneous claims
└── Dependency resolution is automatic

Mailbox
└── Messaging system for agent-to-agent communication
    └── Messages delivered automatically (lead doesn't need to poll)
```

---

## Setup & Configuration

### Enable Agent Teams

Add to `.claude/settings.local.json` (project-local) or `~/.claude/settings.json` (global):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set in shell environment:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Verify It's Working

After enabling, just describe a parallel task to Claude and explicitly ask for a team:

```
Create an agent team to explore this problem from three angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

---

## Display Modes

### In-Process Mode (default, any terminal)

All teammates run inside your main terminal.

- **Shift+Down** — cycle through teammates
- **Type** — send message to currently focused teammate
- **Enter** — view a teammate's session
- **Escape** — interrupt current turn
- **Ctrl+T** — toggle the task list

### Split-Pane Mode (tmux or iTerm2)

Each teammate gets its own visible pane. Click into a pane to interact directly.

**Configure in settings.json:**
```json
{
  "teammateMode": "in-process"
}
```

Options: `"auto"` (default), `"in-process"`, `"tmux"`

**Override for single session:**
```bash
claude --teammate-mode in-process
```

**Auto behavior**: Uses split panes if already inside tmux, in-process otherwise.

### Install Split-Pane Dependencies

```bash
# tmux (recommended)
brew install tmux        # macOS
# or see: https://github.com/tmux/tmux/wiki/Installing

# iTerm2 alternative
npm install -g it2
# Then: iTerm2 → Settings → General → Magic → Enable Python API
```

---

## Controlling the Team

### Specify Team Composition

Claude auto-decides team size based on task. You can override:

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Require Plan Approval Before Implementation

For risky tasks — teammates plan first, lead approves before they touch code:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

**Flow:**
1. Teammate works in read-only plan mode
2. Submits plan approval request to lead
3. Lead approves or rejects with feedback
4. If rejected → teammate revises and resubmits
5. If approved → teammate exits plan mode and begins implementation

**To influence lead's approval criteria:**
```
Only approve plans that include test coverage.
Reject any plan that modifies the database schema.
```

### Talk to Teammates Directly

Each teammate is a full independent Claude Code session. You can message them directly to:
- Give additional instructions
- Ask follow-up questions
- Redirect their approach

### Shut Down a Teammate

```
Ask the researcher teammate to shut down
```

Lead sends a shutdown request. Teammate can approve (exits gracefully) or reject with explanation.

### Clean Up the Team

```
Clean up the team
```

**Always use the lead to clean up** — never teammates (their team context may not resolve correctly).
Cleanup fails if any teammates are still active — shut them down first.

---

## Task Management

### Task States

```
pending → in progress → completed
```

Tasks with unresolved dependencies stay `pending` and cannot be claimed.

### Assignment Methods

**Lead assigns explicitly:**
```
Assign the authentication task to the security teammate
```

**Self-claim (automatic):** After finishing a task, a teammate picks up the next available unblocked task on its own.

### Optimal Task Sizing

- **Too small**: coordination overhead exceeds benefit
- **Too large**: long runs without check-ins = wasted effort risk
- **Just right**: self-contained unit with clear deliverable (a function, test file, or review)

**Rule of thumb**: 5–6 tasks per teammate keeps everyone productive.

### If Tasks Get Stuck

Task status can sometimes lag — if a task appears stuck but work is done, tell the lead:
```
Nudge the implementer teammate to mark their task as complete
```

---

## Communication Patterns

### Lead → Teammate

```
Ask the researcher teammate to focus on the API module next
```

### Teammate → Lead (automatic)

Teammates notify the lead automatically when they finish. No polling required.

### Broadcast (all teammates)

```
Broadcast to all teammates: we're pivoting to focus on authentication only
```

**Use sparingly** — costs scale with team size (each broadcast is one message per teammate).

### Teammate → Teammate

Teammates can message each other directly. Most effective for:
- Sharing findings that another teammate needs
- Challenging each other's hypotheses
- Coordinating on shared dependencies

---

## Quality Gates with Hooks

Hooks let you enforce rules automatically. Two hooks are specific to agent teams:

### TeammateIdle Hook

Runs when a teammate is about to go idle. Use to enforce quality gates before a teammate stops.

**Behavior:**
- Exit code `2` → teammate receives stderr as feedback and keeps working
- Return `{"continue": false, "stopReason": "..."}` → stops teammate entirely

**Input fields:**
```json
{
  "session_id": "abc123",
  "hook_event_name": "TeammateIdle",
  "teammate_name": "researcher",
  "team_name": "my-project",
  "cwd": "/path/to/project",
  "transcript_path": "..."
}
```

**Example — require build artifact before idle:**
```bash
#!/bin/bash
if [ ! -f "./dist/output.js" ]; then
  echo "Build artifact missing. Run the build before stopping." >&2
  exit 2
fi
exit 0
```

**Configure in settings.json:**
```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "hooks": [{ "type": "command", "command": "./scripts/check-build.sh" }]
      }
    ]
  }
}
```

Note: TeammateIdle hooks **do not support matchers** — they fire on every occurrence.

---

### TaskCompleted Hook

Runs when a task is being marked as completed. Fires when:
- Any agent explicitly marks a task complete via TaskUpdate tool
- An agent team teammate finishes its turn with in-progress tasks

**Behavior:**
- Exit code `2` → task NOT marked complete, stderr fed back as feedback
- Return `{"continue": false, "stopReason": "..."}` → stops teammate entirely

**Input fields:**
```json
{
  "session_id": "abc123",
  "hook_event_name": "TaskCompleted",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project",
  "cwd": "/path/to/project",
  "transcript_path": "..."
}
```

**Example — require passing tests before task can close:**
```bash
#!/bin/bash
INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

if ! npm test 2>&1; then
  echo "Tests not passing. Fix failing tests before completing: $TASK_SUBJECT" >&2
  exit 2
fi
exit 0
```

**Configure in settings.json:**
```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "hooks": [{ "type": "command", "command": "./scripts/run-tests.sh" }]
      }
    ]
  }
}
```

Note: TaskCompleted hooks **do not support matchers** — they fire on every occurrence.

---

## Subagents Reference

Subagents are single-session workers. Unlike teammates, they can't communicate laterally — they only report back to the main agent. But they're more lightweight and cheaper.

### Built-in Subagents

| Agent | Model | Tools | When Used |
|---|---|---|---|
| **Explore** | Haiku | Read-only | Codebase search and analysis |
| **Plan** | Inherit | Read-only | Gathering context in plan mode |
| **General-purpose** | Inherit | All tools | Complex multi-step research + modification |
| **Bash** | Inherit | — | Running terminal commands |
| **Claude Code Guide** | Haiku | — | Questions about Claude Code features |

### Creating Custom Subagents

**Via interactive command (recommended):**
```
/agents
```

**Via file** (`.claude/agents/` for project, `~/.claude/agents/` for user-global):

```markdown
---
name: code-reviewer
description: Expert code reviewer. Proactively reviews code after changes.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer. When invoked:
1. Run git diff to see recent changes
2. Review for: security, performance, error handling, tests
3. Report: Critical issues, Warnings, Suggestions
```

### Subagent Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique ID (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this agent — write this clearly |
| `tools` | No | Allowlist of tools. Inherits all if omitted |
| `disallowedTools` | No | Denylist removed from inherited set |
| `model` | No | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before subagent stops |
| `skills` | No | Skills to inject into subagent context at startup |
| `mcpServers` | No | MCP servers scoped to this subagent |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | `user`, `project`, or `local` — enables cross-session memory |
| `background` | No | `true` to always run as background task |
| `effort` | No | `low`, `medium`, `high`, `max` (Opus 4.6 only) |
| `isolation` | No | `worktree` — runs in isolated git worktree |

### Scope Priority (highest wins when names conflict)

1. `--agents` CLI flag (session-only)
2. `.claude/agents/` (project-level)
3. `~/.claude/agents/` (user-level)
4. Plugin's `agents/` directory (lowest)

### Invoking Subagents

**Natural language:**
```
Use the code-reviewer subagent to check my recent changes
```

**@-mention (guarantees delegation):**
```
@"code-reviewer (agent)" look at the auth changes
```

**Run entire session as subagent:**
```bash
claude --agent code-reviewer
```

**Set as session default in settings:**
```json
{ "agent": "code-reviewer" }
```

### Subagent Persistent Memory

Enable with the `memory` field:
```yaml
memory: user      # ~/.claude/agent-memory/<name>/
memory: project   # .claude/agent-memory/<name>/
memory: local     # .claude/agent-memory-local/<name>/ (not in git)
```

When enabled:
- System prompt gets memory read/write instructions
- First 200 lines of `MEMORY.md` are injected
- Read, Write, Edit tools are auto-enabled for memory management

**Best practice prompt to build memory:**
```
Check your memory for patterns you've seen before, then review this PR.
After finishing, save what you learned to your memory.
```

### Disable Specific Subagents

In settings.json:
```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

Or via CLI:
```bash
claude --disallowedTools "Agent(Explore)"
```

---

## Best Practices

### Team Composition

- **Start with 3–5 teammates** for most workflows — balances parallelism with coordination overhead
- **5–6 tasks per teammate** keeps everyone productive without excessive context switching
- **Scale up only** when work genuinely benefits from simultaneous execution
- Three focused teammates often outperform five scattered ones

### Context for Teammates

Teammates load: CLAUDE.md, MCP servers, skills — but NOT the lead's conversation history.

Always include task-specific context in the spawn prompt:
```
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens in httpOnly cookies.
Report issues with severity ratings."
```

### Preventing File Conflicts

Two teammates editing the same file = overwrites. Always:
- Give each teammate an exclusive set of files
- Define clear file ownership boundaries upfront

### Monitoring

- Check in on teammate progress regularly
- Redirect approaches that aren't working early
- Don't let a team run unattended too long — increases wasted effort risk

### If Lead Does Work Instead of Delegating

```
Wait for your teammates to complete their tasks before proceeding
```

### Start Simple

First use: research or review tasks (clear boundaries, no code writing). This shows the value of parallel exploration without coordination challenges of parallel implementation.

---

## Use Case Patterns

### Pattern 1: Parallel Code Review

Each reviewer gets a distinct domain — no overlap, comprehensive coverage:

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Pattern 2: Scientific Debate for Debugging

Forces teammates to actively challenge each other's theories. The surviving theory is the real root cause:

```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk
to each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

**Why this works**: Sequential investigation suffers from anchoring bias. Parallel adversarial investigation breaks that bias.

### Pattern 3: Parallel Feature Implementation

```
Create a team with 3 teammates to implement the new checkout flow:
- Teammate 1: frontend components in src/components/checkout/
- Teammate 2: API endpoints in src/api/checkout/
- Teammate 3: database migrations and models in src/db/
Each teammate owns their files exclusively.
```

### Pattern 4: Multi-Angle Exploration

```
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles:
one teammate on UX, one on technical architecture, one playing devil's advocate.
```

---

## Troubleshooting

### Teammates Not Appearing

1. In in-process mode, press **Shift+Down** — they may already be running
2. Task may not have been complex enough to warrant a team
3. For split panes: `which tmux` — verify tmux is in PATH
4. For iTerm2: verify `it2` CLI installed and Python API enabled

### Too Many Permission Prompts

Pre-approve common operations in permission settings before spawning teammates:
```json
{
  "permissions": {
    "allow": ["Bash(npm test)", "Bash(git diff)"]
  }
}
```

### Teammate Stopped on Error

1. Use **Shift+Down** to check their output
2. Either give them additional instructions directly
3. Or spawn a replacement teammate to continue the work

### Lead Shut Down Before Work Done

Tell it to keep going:
```
Continue working — don't shut down until all tasks are marked complete
```

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

### Task Appears Stuck (status not updating)

Check if work is actually done, then:
```
Tell the researcher teammate to mark their current task as complete
```

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| `/resume` and `/rewind` don't restore in-process teammates | Tell lead to spawn new teammates after resuming |
| Task status can lag / fail to update | Manually tell lead to nudge teammate |
| Shutdown can be slow (waits for current request/tool call) | Be patient |
| One team per session (can't manage multiple teams) | Clean up current team before starting new one |
| No nested teams (teammates can't spawn their own teams) | Only the lead can manage the team |
| Lead is fixed for team lifetime | Can't promote a teammate to lead |
| Permissions set at spawn time for all teammates | Can change individual modes after spawning |
| Split panes require tmux or iTerm2 | Not supported in VS Code terminal, Windows Terminal, or Ghostty |

---

## File Locations

| Resource | Path |
|---|---|
| Team config | `~/.claude/teams/{team-name}/config.json` |
| Task list | `~/.claude/tasks/{team-name}/` |
| User subagents | `~/.claude/agents/` |
| Project subagents | `.claude/agents/` |
| Subagent transcripts | `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` |
| User agent memory | `~/.claude/agent-memory/{agent-name}/` |
| Project agent memory | `.claude/agent-memory/{agent-name}/` |
| Local agent memory | `.claude/agent-memory-local/{agent-name}/` |

Team config structure:
```json
{
  "members": [
    { "name": "researcher", "agentId": "...", "agentType": "..." },
    { "name": "implementer", "agentId": "...", "agentType": "..." }
  ]
}
```

Teammates can read the team config to discover other team members.

---

## Quick Reference Cheat Sheet

```bash
# Enable agent teams
# In .claude/settings.local.json:
# { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

# Navigate teammates (in-process mode)
Shift+Down     # cycle to next teammate
Enter          # view teammate session
Escape         # interrupt current turn
Ctrl+T         # toggle task list

# Configure display mode
claude --teammate-mode in-process
claude --teammate-mode tmux

# Run session as a specific subagent
claude --agent code-reviewer

# List all configured subagents
claude agents

# Manage subagents interactively
/agents
```

### Prompt Templates

```
# Start a team
Create an agent team with [N] teammates: [describe each role/focus area]

# Require plan approval
Spawn a [role] teammate. Require plan approval before making any changes.

# Keep lead from doing work itself
Wait for your teammates to complete their tasks before proceeding.

# Scientific debate debugging
Spawn [N] teammates to investigate [problem]. Have them challenge each
other's theories like a scientific debate. Update [doc] with consensus.

# Clean shutdown
Ask the [name] teammate to shut down, then clean up the team.
```
