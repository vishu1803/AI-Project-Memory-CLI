# 🧠 ai-memory

Deterministic, **AI-free** project memory CLI for software projects.

`ai-memory` maintains a local `.ai-memory/` folder that tracks architecture, features, decisions, and commit-based changes so any external AI tool can consume stable project context later.

## Why

- Prevent project-context loss over time
- Keep memory deterministic and offline
- Avoid model lock-in (memory engine has zero AI dependencies)
- Let developers use any external AI/IDE assistant as a consumer

## Installation

```bash
npm install
npm run build
npm link
```

## Commands

### `ai-memory init`

One-time setup:
- creates `.ai-memory/`
- writes memory files
- installs `.git/hooks/post-commit` hook that runs `ai-memory sync`

### `ai-memory sync`

AI-free deterministic sync from git:
- detects added/modified/deleted files
- refreshes architecture snapshot from project scan
- records dependency changes from `package.json`
- appends structured commit entry to `change-log.json`
- adds feature candidates from structural paths like `src/<module>`

> Normally this runs automatically after each commit via git hook.

### `ai-memory decision "text"`

Appends a timestamped manual decision to `.ai-memory/decisions.md`.

### `ai-memory ask "question"`

Builds and prints a structured context prompt (memory + relevant files) for use in any external AI tool.

## Memory Files

`.ai-memory/`
- `project-summary.md`
- `architecture.json`
- `features.json`
- `decisions.md`
- `change-log.json`

## Design Principles

- AI-free core engine
- deterministic outputs
- commit-based updates
- human-readable files
- offline/local-first

## Testing

```bash
npm run test
npm run test:ci
```
