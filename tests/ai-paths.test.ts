import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function runCli(cwd: string, args: string[], env: Record<string, string>): Promise<{ code: number | null; stdout: string; stderr: string }> {
    const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const cliEntry = path.join(repoRoot, 'src', 'index.ts');

    return await new Promise(resolve => {
        const child = spawn(process.execPath, [tsxCli, cliEntry, ...args], {
            cwd,
            env: { ...process.env, ...env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => {
            stdout += String(chunk);
        });

        child.stderr.on('data', chunk => {
            stderr += String(chunk);
        });

        child.on('close', code => {
            resolve({ code, stdout, stderr });
        });
    });
}

test('sync + ask AI paths work with mocked OpenAI-compatible API', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'ai-memory-ai-paths-'));

    const seenModels: string[] = [];

    const server = createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/chat/completions') {
            res.statusCode = 404;
            res.end('not found');
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += String(chunk);
        });

        req.on('end', () => {
            const payload = JSON.parse(body) as { model?: string; messages?: Array<{ role: string; content: string }> };
            if (payload.model) seenModels.push(payload.model);
            const userMessage = payload.messages?.find(m => m.role === 'user')?.content || '';
            const isSync = userMessage.includes('Analyze the following git changes and update the project memory');

            const content = isSync
                ? JSON.stringify({
                    architecture: {
                        framework: 'Node.js',
                        languages: ['TypeScript'],
                        directories: { src: 'Source code' },
                        entryPoints: ['src/index.ts'],
                    },
                    features: [
                        {
                            name: 'Auth',
                            description: 'Authentication flow added',
                            status: 'active',
                            files: ['src/auth.ts'],
                        },
                    ],
                    changeLogEntry: {
                        date: new Date().toISOString(),
                        commit: 'mock-commit',
                        summary: 'Added authentication feature scaffolding',
                        filesChanged: ['src/auth.ts'],
                    },
                })
                : 'Refactor suggestion: extract auth checks into middleware and add unit tests.';

            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ choices: [{ message: { content } }] }));
        });
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));

    try {
        const address = server.address();
        assert.ok(address && typeof address === 'object');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify({
            name: 'fixture-ai-path',
            version: '0.0.1',
            dependencies: {},
            devDependencies: {},
        }, null, 2));
        mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
        writeFileSync(path.join(tempRoot, 'src/index.ts'), 'console.log("hello")\n');

        execSync('git init', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git config user.email "test@example.com"', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git config user.name "Test User"', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git add .', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: tempRoot, stdio: 'pipe' });

        const initResult = await runCli(tempRoot, ['init'], {});
        assert.equal(initResult.code, 0, initResult.stderr || initResult.stdout);

        writeFileSync(path.join(tempRoot, 'src/auth.ts'), 'export const auth = true\n');
        execSync('git add .', { cwd: tempRoot, stdio: 'pipe' });
        execSync('git commit -m "add auth"', { cwd: tempRoot, stdio: 'pipe' });

        const commonEnv = {
            AI_API_KEY: 'test-key',
            AI_BASE_URL: baseUrl,
            AI_MODEL: 'fallback-model',
            AI_MEMORY_MODEL: 'memory-model',
            AI_CODING_MODEL: 'coding-model',
        };

        const syncResult = await runCli(tempRoot, ['sync'], commonEnv);
        assert.equal(syncResult.code, 0, syncResult.stderr || syncResult.stdout);
        assert.match(syncResult.stdout, /Commit:/i);

        const features = JSON.parse(readFileSync(path.join(tempRoot, '.ai-memory/features.json'), 'utf-8')) as Array<{ name: string }>;
        assert.equal(features[0]?.name, 'Auth');

        const askResult = await runCli(tempRoot, ['ask', 'How should I improve auth?'], commonEnv);
        assert.equal(askResult.code, 0, askResult.stderr || askResult.stdout);
        assert.match(askResult.stdout, /Refactor suggestion/i);

        assert.equal(seenModels[0], 'memory-model');
        assert.equal(seenModels[1], 'coding-model');
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        rmSync(tempRoot, { recursive: true, force: true });
    }
});
