import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { scanProject } from '../src/core/scanner.js';
import { initMemory, readMemory, appendDecision, MEMORY_FILES } from '../src/core/memory.js';

test('initMemory creates expected .ai-memory files and readable memory payload', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'ai-memory-test-'));

    try {
        writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify({
            name: 'fixture-app',
            version: '0.1.0',
            description: 'fixture project',
            dependencies: { commander: '^12.0.0' },
            devDependencies: { typescript: '^5.0.0' },
        }, null, 2));

        const srcDir = path.join(tempRoot, 'src');
        mkdirSync(srcDir, { recursive: true });
        writeFileSync(path.join(srcDir, 'index.ts'), 'console.log("hello")\n');
        writeFileSync(path.join(tempRoot, 'README.md'), '# Fixture');

        const info = scanProject(tempRoot);
        initMemory(tempRoot, info);

        assert.equal(existsSync(path.join(tempRoot, MEMORY_FILES.projectSummary)), true);
        assert.equal(existsSync(path.join(tempRoot, MEMORY_FILES.architecture)), true);
        assert.equal(existsSync(path.join(tempRoot, MEMORY_FILES.features)), true);
        assert.equal(existsSync(path.join(tempRoot, MEMORY_FILES.decisions)), true);
        assert.equal(existsSync(path.join(tempRoot, MEMORY_FILES.changeLog)), true);

        const memory = readMemory(tempRoot);
        assert.match(memory.projectSummary, /fixture-app/);
        assert.match(memory.projectSummary, /Project Type: Node.js/);
        assert.match(memory.projectSummary, /Language: TypeScript/);
        assert.match(memory.projectSummary, /Framework: TypeScript \(generic\)/);
        assert.match(memory.projectSummary, /Package Manager: npm/);
        assert.match(memory.projectSummary, /Entry Points:/);
        assert.match(memory.projectSummary, /src\/index.ts/);
        assert.match(memory.projectSummary, /Main Dependencies:/);
        assert.equal(Array.isArray(memory.features), true);
        assert.equal(Array.isArray(memory.changeLog), true);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('appendDecision appends timestamped decision line', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'ai-memory-test-'));

    try {
        const decisionsPath = path.join(tempRoot, MEMORY_FILES.decisions);
        appendDecision(tempRoot, 'Adopt modular command handlers');

        const content = readFileSync(decisionsPath, 'utf-8');
        assert.match(content, /# Architectural Decisions/);
        assert.match(content, /Adopt modular command handlers/);
        assert.match(content, /\*\*\[/);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});
