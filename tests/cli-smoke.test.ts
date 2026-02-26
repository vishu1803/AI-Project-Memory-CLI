import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('CLI help command prints expected commands', () => {
    const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const result = spawnSync(process.execPath, [tsxCli, 'src/index.ts', '--help'], {
        encoding: 'utf-8',
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: ai-memory/);
    assert.match(result.stdout, /init/);
    assert.match(result.stdout, /sync/);
    assert.match(result.stdout, /decision/);
    assert.match(result.stdout, /ask/);
});
