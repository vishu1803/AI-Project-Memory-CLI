import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function runCli(cwd: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
    const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const cliEntry = path.join(repoRoot, 'src', 'index.ts');

    return await new Promise(resolve => {
        const child = spawn(process.execPath, [tsxCli, cliEntry, ...args], { cwd });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => { stdout += String(chunk); });
        child.stderr.on('data', chunk => { stderr += String(chunk); });
        child.on('close', code => resolve({ code, stdout, stderr }));
    });
}

test('init installs post-commit hook and sync updates memory deterministically', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'ai-memory-sync-'));

    try {
        writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify({
            name: 'fixture-sync',
            version: '0.0.1',
            dependencies: { express: '^4.0.0' },
            devDependencies: { typescript: '^5.0.0' },
        }, null, 2));
        mkdirSync(path.join(tempRoot, 'src', 'auth'), { recursive: true });
        writeFileSync(path.join(tempRoot, 'src/index.ts'), 'console.log("hello")\n');

        execSync('git init', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git config user.email "test@example.com"', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git config user.name "Test User"', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git add .', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: tempRoot, stdio: 'pipe' });

        const initResult = await runCli(tempRoot, ['init']);
        assert.equal(initResult.code, 0, initResult.stderr || initResult.stdout);

        const hookPath = path.join(tempRoot, '.git', 'hooks', 'post-commit');
        assert.equal(existsSync(hookPath), true);
        assert.match(readFileSync(hookPath, 'utf-8'), /ai-memory sync/);

        writeFileSync(path.join(tempRoot, 'src/auth/service.ts'), 'export const enabled = true\n');
        writeFileSync(path.join(tempRoot, 'src/new-feature.ts'), 'export const feature = 1\n');
        execSync('git add .', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git commit -m "add auth feature"', { cwd: tempRoot, stdio: 'pipe' });

        const syncResult = await runCli(tempRoot, ['sync']);
        assert.equal(syncResult.code, 0, syncResult.stderr || syncResult.stdout);
        assert.match(syncResult.stdout, /Commit:/);

        const features = JSON.parse(readFileSync(path.join(tempRoot, '.ai-memory/features.json'), 'utf-8')) as Array<{ name: string }>;
        assert.equal(features.some(feature => feature.name.toLowerCase() === 'auth'), true);

        const changeLog = JSON.parse(readFileSync(path.join(tempRoot, '.ai-memory/change-log.json'), 'utf-8')) as Array<{ addedFiles: string[] }>;
        assert.equal(Array.isArray(changeLog[0]?.addedFiles), true);
        assert.equal(changeLog[0].addedFiles.length > 0, true);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});
