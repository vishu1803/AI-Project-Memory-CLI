import * as fs from 'node:fs';
import * as path from 'node:path';
import _simpleGit, { type SimpleGit, type DiffResultTextFile } from 'simple-git';
import { MEMORY_FILES } from './memory.js';

// Handle ESM/CJS interop
const simpleGit = (_simpleGit as any).default ?? _simpleGit;

// ── Types ──────────────────────────────────────────────────────────────

export interface DiffSummary {
    commit: string;
    changed: DiffResultTextFile[];
    insertions: number;
    deletions: number;
    filesChanged: string[];
    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    diffs: string;
}

// ── Git helpers ────────────────────────────────────────────────────────

function getGit(rootDir: string): SimpleGit {
    return simpleGit(rootDir);
}

export async function getLastSyncCommit(rootDir: string): Promise<string | null> {
    const syncFile = path.join(rootDir, MEMORY_FILES.lastSync);
    try {
        return fs.readFileSync(syncFile, 'utf-8').trim() || null;
    } catch {
        return null;
    }
}

export async function setLastSyncCommit(rootDir: string, hash: string): Promise<void> {
    const syncFile = path.join(rootDir, MEMORY_FILES.lastSync);
    fs.writeFileSync(syncFile, hash, 'utf-8');
}

export async function getCurrentCommit(rootDir: string): Promise<string> {
    const git = getGit(rootDir);
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash || 'HEAD';
}

function parseNameStatus(rawNameStatus: string): {
    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
} {
    const addedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    for (const line of rawNameStatus.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const [status, ...fileParts] = trimmed.split(/\s+/);
        const file = fileParts.join(' ').trim();
        if (!file) continue;

        if (status.startsWith('A')) addedFiles.push(file);
        else if (status.startsWith('D')) deletedFiles.push(file);
        else modifiedFiles.push(file);
    }

    return { addedFiles, modifiedFiles, deletedFiles };
}

export async function getDiffSummary(rootDir: string, sinceCommit?: string): Promise<DiffSummary> {
    const git = getGit(rootDir);

    const since = sinceCommit || (await getLastSyncCommit(rootDir));
    const currentCommit = await getCurrentCommit(rootDir);

    let diff;
    let rawDiff: string;
    let rawNameStatus = '';

    if (since) {
        diff = await git.diffSummary([since, 'HEAD']);
        rawDiff = await git.diff([since, 'HEAD', '--stat']);
        rawNameStatus = await git.raw(['diff', '--name-status', since, 'HEAD']);
    } else {
        // First sync — diff against previous commit if available
        diff = await git.diffSummary(['HEAD~1', 'HEAD']).catch(async () => {
            // Single-commit repo — show staged changes if present
            return git.diffSummary(['--cached']);
        });
        rawDiff = await git.diff(['HEAD~1', 'HEAD', '--stat']).catch(() => '');
        rawNameStatus = await git.raw(['diff', '--name-status', 'HEAD~1', 'HEAD']).catch(() => '');
    }

    const { addedFiles, modifiedFiles, deletedFiles } = parseNameStatus(rawNameStatus);

    return {
        commit: currentCommit,
        changed: diff.files as DiffResultTextFile[],
        insertions: diff.insertions,
        deletions: diff.deletions,
        filesChanged: diff.files.map(f => f.file),
        addedFiles,
        modifiedFiles,
        deletedFiles,
        diffs: rawDiff,
    };
}

export async function getRecentChangedFiles(rootDir: string, n = 3): Promise<string[]> {
    const git = getGit(rootDir);
    const log = await git.log({ maxCount: n });

    const files = new Set<string>();
    for (const entry of log.all) {
        const diff = await git.diffSummary([`${entry.hash}~1`, entry.hash]).catch(() => null);
        if (diff) {
            for (const f of diff.files) {
                files.add(f.file);
            }
        }
    }

    return [...files];
}

export async function readFileContents(rootDir: string, filePaths: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const fp of filePaths) {
        const fullPath = path.join(rootDir, fp);
        try {
            if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                // Skip files larger than 50KB
                if (stat.size > 50_000) {
                    result[fp] = `[File too large: ${(stat.size / 1024).toFixed(1)}KB]`;
                    continue;
                }
                result[fp] = fs.readFileSync(fullPath, 'utf-8');
            }
        } catch {
            // skip unreadable files
        }
    }

    return result;
}
