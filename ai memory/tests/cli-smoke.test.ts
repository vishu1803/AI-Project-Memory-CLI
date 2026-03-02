import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function resolveTsxCliPath(startDir: string): string {
    let currentDir = startDir;
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(currentDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
        if (existsSync(candidate)) return candidate;
        const parent = path.dirname(currentDir);
        if (parent === currentDir) break;
        currentDir = parent;
    }
    return path.join(startDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

test('CLI help command prints expected commands', () => {
    const repoRoot = path.resolve(process.cwd());
    const tsxCli = resolveTsxCliPath(repoRoot);
    const result = spawnSync(process.execPath, [tsxCli, path.join(repoRoot, 'src', 'index.ts'), '--help'], {
        encoding: 'utf-8',
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: ai-memory/);
    assert.match(result.stdout, /init/);
    assert.match(result.stdout, /sync/);
    assert.match(result.stdout, /decision/);
    assert.match(result.stdout, /ask/);
});
