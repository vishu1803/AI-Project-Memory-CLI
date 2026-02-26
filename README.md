# 🧠 AI Memory

> CLI tool that maintains structured project memory for AI-assisted development.

Prevents AI context loss during coding by maintaining a local structured memory of your project that can be injected into AI prompts.

## Installation

```bash
npm install
npm run build
npm link    # makes 'ai-memory' available globally
```

## Setup

```bash
cp .env.example .env
# Edit .env with your API + model settings
```

The CLI supports any OpenAI-compatible provider.

## AI Architecture (aligned with project vision)

### Minimal built-in AI (memory maintenance)
Used for **structured summarization only** (especially `sync`):
- update architecture/features/changelog memory
- low-token, low-temperature responses
- no auto file modification

Configured with:
- `AI_MEMORY_MODEL`

### External coding AI (developer suggestions)
Used for `ask` command to get implementation guidance with memory context injected:
- suggestions/refactoring guidance
- developer applies changes manually

Configured with:
- `AI_CODING_MODEL`

Shared config:
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL` (fallback model for both flows)

## Commands

### `ai-memory init`

Initialize AI memory in the current project. Creates a `.ai-memory/` folder with:

| File | Purpose |
|------|---------|
| `project-summary.md` | Human-readable project overview |
| `architecture.json` | Framework, languages, directory map |
| `features.json` | Feature registry with status tracking |
| `decisions.md` | Timestamped architectural decisions |
| `change-log.json` | Commit-based change history |

```bash
cd your-project
ai-memory init
```

### `ai-memory sync`

Analyze git changes since last sync and update memory files using minimal AI summarization.

```bash
git commit -m "add user auth"
ai-memory sync
```

### `ai-memory decision "text"`

Log an architectural decision with a timestamp.

```bash
ai-memory decision "Switch from REST to GraphQL for the API layer"
```

### `ai-memory ask "question"`

Ask coding AI for suggestions with full project memory context injected.

```bash
ai-memory ask "How should I add rate limiting to the API?"
ai-memory ask "What files would I need to change to add dark mode?" -f src/theme.ts
```

## Project Structure

```
src/
├── index.ts          # CLI entry point
├── ai/
│   └── client.ts     # OpenAI-compatible API client
├── cli/
│   ├── init.ts       # init command
│   ├── sync.ts       # sync command
│   ├── decision.ts   # decision command
│   └── ask.ts        # ask command
└── core/
    ├── scanner.ts     # Project structure scanner
    ├── memory.ts      # Memory file management
    ├── git.ts         # Git integration (simple-git)
    └── prompt-builder.ts  # Structured prompt construction
```

## Design Principles

- **Commit-based** — memory updates tied to git commits
- **Human-readable** — all memory files are plain Markdown/JSON
- **Minimal tokens** — structured prompts to reduce API usage
- **Suggestion-only** — AI advises, never auto-modifies your code
- **Modular** — clean separation of core, CLI, and AI layers

## Testing

```bash
npm run test
npm run test:ci
```

Includes:
- CLI smoke checks
- memory workflow tests
- mocked AI integration path (`sync` + `ask`)

## License

MIT
