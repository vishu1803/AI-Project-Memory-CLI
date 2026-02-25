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
# Edit .env with your API key
```

Supported providers (any OpenAI-compatible API):
- **OpenAI** — `AI_BASE_URL=https://api.openai.com/v1`
- **Anthropic** (via proxy) — use a compatible endpoint
- **Local models** (Ollama, LM Studio) — `AI_BASE_URL=http://localhost:11434/v1`

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

Analyze git changes since last sync and update memory files using AI.

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

Ask AI a question with full project context injected automatically.

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

## License

MIT
