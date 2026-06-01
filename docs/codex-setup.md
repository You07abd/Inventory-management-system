# Codex Setup & Usage

## What it is

Codex is OpenAI's CLI agent that writes and edits code. The workflow is: **Claude plans and coordinates; Codex writes all code**. Claude reads files, reasons about what to change, then hands exact instructions to Codex which applies the edits.

---

## Installation

Requires Node.js. Install the Codex CLI globally:

```bash
npm install -g @openai/codex
```

Verify:

```bash
codex --version
```

---

## Authentication

Log in with your ChatGPT/OpenAI account once:

```bash
codex login
```

In a Claude Code terminal session you can run:

```
! codex login
```

---

## How it works with Claude Code

This setup uses the **superpowers plugin** to wire Claude and Codex together:

| Role | Tool | Responsibility |
|------|------|----------------|
| Plan & coordinate | Claude | Reads files, understands context, writes precise instructions |
| Write & edit code | Codex | Applies edits to files, runs commands |

Claude never uses its own `Edit`/`Write` tools for code — it always delegates to Codex via the `codex:rescue` skill.

### Installing the superpowers plugin

The superpowers plugin must be installed in Claude Code for the `/codex:rescue` skill to be available. Install it from the Claude Code plugins registry or by following the plugin's own setup instructions.

### Triggering Codex from Claude

When Claude needs to write code, it invokes `/codex:rescue` with a precise prompt — file paths, exact lines to change, before/after code. Codex applies the changes.

---

## Skills

| Skill | What it does |
|-------|-------------|
| `/codex:setup` | Check if Codex is installed and authenticated |
| `/codex:rescue` | Delegate a coding task to Codex |

---

## Review gate (optional)

By default the review gate is off — Codex applies changes immediately. To require a manual review before each stop:

```
/codex:setup --enable-review-gate
```

To disable:

```
/codex:setup --disable-review-gate
```

---

## Committing

Codex runs in a sandbox that blocks `git commit`. After changes are applied, commit manually:

```bash
git add <files>
git commit -m "your message"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `codex: command not found` | Run `npm install -g @openai/codex` |
| Not authenticated | Run `! codex login` in the Claude session |
| Changes not applied | Ensure file paths in the Codex prompt were exact |
