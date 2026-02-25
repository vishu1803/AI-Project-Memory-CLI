import type { Memory } from './memory.js';
import type { DiffSummary } from './git.js';

// ── Sync Prompt ────────────────────────────────────────────────────────

export function buildSyncPrompt(diff: DiffSummary, memory: Memory): string {
    return `You are an AI code analyst. Analyze the following git changes and update the project memory.

## Current Project Summary
${memory.projectSummary}

## Current Architecture
\`\`\`json
${JSON.stringify(memory.architecture, null, 2)}
\`\`\`

## Current Features
\`\`\`json
${JSON.stringify(memory.features, null, 2)}
\`\`\`

## Git Changes (since last sync)
- Files changed: ${diff.filesChanged.length}
- Insertions: ${diff.insertions}
- Deletions: ${diff.deletions}
- Changed files: ${diff.filesChanged.join(', ')}

### Diff Stats
\`\`\`
${diff.diffs}
\`\`\`

## Instructions
Respond with a JSON object containing three keys:
1. **architecture** — Updated architecture object (same shape, updated if structure changed)
2. **features** — Updated features array (add new features, update existing, mark deprecated)
3. **changeLogEntry** — Object with: date (ISO), commit (hash), summary (1-2 sentences), filesChanged (array)

Commit hash: ${diff.commit}
Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON, no markdown fences, no extra text.`;
}

// ── Ask Prompt ─────────────────────────────────────────────────────────

export function buildAskPrompt(
    question: string,
    memory: Memory,
    relevantFiles: Record<string, string>,
): string {
    const fileSnippets = Object.entries(relevantFiles)
        .map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``)
        .join('\n\n');

    return `You are an expert software engineer helping with a project. Use the project context below to answer the question.

## Project Summary
${memory.projectSummary}

## Architecture
\`\`\`json
${JSON.stringify(memory.architecture, null, 2)}
\`\`\`

## Feature Registry
\`\`\`json
${JSON.stringify(memory.features, null, 2)}
\`\`\`

## Architectural Decisions
${memory.decisions}

## Recent Changes
\`\`\`json
${JSON.stringify(memory.changeLog.slice(0, 5), null, 2)}
\`\`\`

## Relevant Source Files
${fileSnippets || '_No relevant files detected._'}

---

## Question
${question}

## Instructions
- Provide a clear, actionable answer using the project context above.
- Reference specific files, functions, or patterns when relevant.
- If suggesting code changes, show the code but do NOT auto-apply anything.
- Keep your response concise and well-structured.`;
}
