import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readMemory, MEMORY_FILES } from '../core/memory.js';
import { getRecentChangedFiles, readFileContents } from '../core/git.js';
import { buildAskPrompt } from '../core/prompt-builder.js';
import { askAI } from '../ai/client.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const askCommand = new Command('ask')
    .description('Ask AI a question with full project context')
    .argument('<question>', 'Your question or request')
    .option('-f, --files <files...>', 'Additional files to include as context')
    .action(async (question: string, options: { files?: string[] }) => {
        const rootDir = process.cwd();
        const memDir = path.join(rootDir, MEMORY_FILES.dir);

        if (!fs.existsSync(memDir)) {
            console.log(chalk.red('✗ No .ai-memory found. Run "ai-memory init" first.'));
            process.exit(1);
        }

        const spinner = ora('Loading project memory...').start();

        try {
            // Load memory
            const memory = readMemory(rootDir);

            // Get recently changed files
            spinner.text = 'Detecting relevant files...';
            let relevantFilePaths: string[] = [];

            try {
                relevantFilePaths = await getRecentChangedFiles(rootDir, 3);
            } catch {
                // Git might not be available or no commits
            }

            // Add manually specified files
            if (options.files) {
                relevantFilePaths.push(...options.files);
            }

            // Deduplicate and limit
            relevantFilePaths = [...new Set(relevantFilePaths)].slice(0, 15);

            // Read file contents
            const relevantFiles = await readFileContents(rootDir, relevantFilePaths);

            // Build and send prompt
            spinner.text = 'Asking AI...';
            const prompt = buildAskPrompt(question, memory, relevantFiles);
            const response = await askAI(prompt, 'You are an expert software engineer. Be concise, specific, and actionable.');

            spinner.stop();

            // Print response
            console.log('');
            console.log(chalk.cyan.bold('🤖 AI Response'));
            console.log(chalk.dim('─'.repeat(60)));
            console.log('');
            console.log(response);
            console.log('');
            console.log(chalk.dim('─'.repeat(60)));
            console.log(chalk.dim(`Context: ${Object.keys(relevantFiles).length} files • ${memory.changeLog.length} changelog entries`));
            console.log('');
        } catch (error: unknown) {
            spinner.fail(chalk.red('Ask failed'));
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`  ${msg}`));
            process.exit(1);
        }
    });
