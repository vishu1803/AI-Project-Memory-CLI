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
- Added files: ${diff.addedFiles.length}
- Modified files: ${diff.modifiedFiles.length}
- Deleted files: ${diff.deletedFiles.length}
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

function truncate(text: string, maxLines = 200): string {
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
}

export function buildAskPrompt(
    question: string,
    memory: Memory,
    relevantFiles: Record<string, string>,
): string {
    // Truncate file snippets to keep prompt small
    const fileEntries = Object.entries(relevantFiles).slice(0, 5);
    const fileSnippets = fileEntries
        .map(([name, content]) => `### ${name}\n\`\`\`\n${truncate(content, 50)}\n\`\`\``)
        .join('\n\n');

    // Use compact summary (first 15 lines only)
    const summary = memory.projectSummary.split('\n').slice(0, 15).join('\n');
    const recentChanges = memory.changeLog
        .slice(0, 5)
        .map(entry => `- [${entry.date}] ${entry.summary} (${entry.filesChanged.length} files)`)
        .join('\n');

    return `You are a software engineer. Answer the question using the project context.

## Project
${summary}

## Architecture
${JSON.stringify(memory.architecture)}

## Feature Registry
${JSON.stringify(memory.features)}

## Decisions
${memory.decisions.split('\n').slice(0, 20).join('\n')}

## Recent Changes
${recentChanges || 'No recent changes recorded yet.'}

## Files
${fileSnippets || 'None'}

## Question
${question}

Constraints:
- Suggestion-only mode: do not claim files were edited.
- Be concise and actionable.
- If context is missing, explicitly say what additional info would help.`;
}
