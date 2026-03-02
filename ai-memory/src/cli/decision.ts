import { Command } from 'commander';
import chalk from 'chalk';
import { appendDecision, MEMORY_FILES } from '../core/memory.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const decisionCommand = new Command('decision')
    .description('Log an architectural decision')
    .argument('<text>', 'Decision text to log')
    .action((text: string) => {
        const rootDir = process.cwd();
        const memDir = path.join(rootDir, MEMORY_FILES.dir);

        if (!fs.existsSync(memDir)) {
            console.log(chalk.red('✗ No .ai-memory found. Run "ai-memory init" first.'));
            process.exit(1);
        }

        try {
            appendDecision(rootDir, text);
            console.log(chalk.green('✓ Decision logged successfully!'));
            console.log(chalk.dim(`  "${text}"`));
            console.log(chalk.dim(`  → ${MEMORY_FILES.decisions}`));
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`✗ Failed to log decision: ${msg}`));
            process.exit(1);
        }
    });
