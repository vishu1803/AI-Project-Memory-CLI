import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getDiffSummary, getCurrentCommit, setLastSyncCommit } from '../core/git.js';
import { readMemory, updateMemory, MEMORY_FILES } from '../core/memory.js';
import { buildSyncPrompt } from '../core/prompt-builder.js';
import { askAI } from '../ai/client.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const syncCommand = new Command('sync')
    .description('Sync memory with recent git changes using AI analysis')
    .action(async () => {
        const rootDir = process.cwd();
        const memDir = path.join(rootDir, MEMORY_FILES.dir);

        if (!fs.existsSync(memDir)) {
            console.log(chalk.red('✗ No .ai-memory found. Run "ai-memory init" first.'));
            process.exit(1);
        }

        const spinner = ora('Analyzing git changes...').start();

        try {
            const diff = await getDiffSummary(rootDir);

            if (diff.filesChanged.length === 0) {
                spinner.info(chalk.yellow('No changes detected since last sync.'));
                return;
            }

            spinner.text = `Found ${diff.filesChanged.length} changed files. Consulting AI...`;

            const memory = readMemory(rootDir);
            const prompt = buildSyncPrompt(diff, memory);
            const response = await askAI(prompt, 'You are a code analysis assistant. Always respond with valid JSON.');

            spinner.text = 'Updating memory files...';

            // Parse AI response
            let updates;
            try {
                // Strip markdown code fences if present
                const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                updates = JSON.parse(cleaned);
            } catch {
                spinner.warn(chalk.yellow('AI response was not valid JSON. Saving raw response to change log.'));
                updateMemory(rootDir, {
                    changeLogEntry: {
                        date: new Date().toISOString(),
                        commit: diff.commit,
                        summary: `${diff.filesChanged.length} files changed (AI parse failed)`,
                        filesChanged: diff.filesChanged,
                    },
                });
                const currentHash = await getCurrentCommit(rootDir);
                await setLastSyncCommit(rootDir, currentHash);
                return;
            }

            // Apply updates
            updateMemory(rootDir, {
                architecture: updates.architecture,
                features: updates.features,
                changeLogEntry: updates.changeLogEntry,
            });

            const currentHash = await getCurrentCommit(rootDir);
            await setLastSyncCommit(rootDir, currentHash);

            spinner.succeed(chalk.green('Memory synced successfully!'));
            console.log('');
            console.log(chalk.dim(`  Commit: ${currentHash.slice(0, 8)}`));
            console.log(chalk.dim(`  Files changed: ${diff.filesChanged.length}`));
            console.log(chalk.dim(`  Insertions: +${diff.insertions}  Deletions: -${diff.deletions}`));
            if (updates.changeLogEntry?.summary) {
                console.log(chalk.dim(`  Summary: ${updates.changeLogEntry.summary}`));
            }
            console.log('');
        } catch (error: unknown) {
            spinner.fail(chalk.red('Sync failed'));
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`  ${msg}`));
            process.exit(1);
        }
    });
