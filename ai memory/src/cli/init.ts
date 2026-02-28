import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '../core/scanner.js';
import { initMemory, MEMORY_FILES } from '../core/memory.js';
import { installPostCommitHook } from '../core/git.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const initCommand = new Command('init')
    .description('Initialize AI memory for the current project')
    .action(async () => {
        const rootDir = process.cwd();
        const memDir = path.join(rootDir, MEMORY_FILES.dir);

        if (fs.existsSync(memDir)) {
            console.log(chalk.yellow('⚠  .ai-memory already exists.'));
            const hookInstalled = installPostCommitHook(rootDir);
            if (hookInstalled) {
                console.log(chalk.green('✓ Git post-commit hook verified/installed.'));
            }
            return;
        }

        const spinner = ora('Scanning project structure...').start();

        try {
            const info = scanProject(rootDir);
            spinner.text = 'Generating memory files...';
            initMemory(rootDir, info);

            const hookInstalled = installPostCommitHook(rootDir);

            spinner.succeed(chalk.green('Project memory initialized successfully!'));
            console.log('');
            console.log(chalk.dim('  Created files:'));
            console.log(chalk.cyan('    ├── project-summary.md'));
            console.log(chalk.cyan('    ├── architecture.json'));
            console.log(chalk.cyan('    ├── features.json'));
            console.log(chalk.cyan('    ├── decisions.md'));
            console.log(chalk.cyan('    └── change-log.json'));
            console.log('');
            console.log(chalk.dim(`  Framework detected: ${chalk.bold(info.framework)}`));
            console.log(chalk.dim(`  Dependencies: ${Object.keys(info.dependencies).length}`));
            console.log(chalk.dim(`  Directories: ${info.structure.directories.length}`));
            console.log(chalk.dim(`  Files: ${info.structure.files.length}`));
            console.log('');
            if (hookInstalled) {
                console.log(chalk.green('✓ Auto-sync enabled via .git/hooks/post-commit'));
            } else {
                console.log(chalk.yellow('⚠ Git repository not found. Auto-sync hook not installed.'));
            }
        } catch (error: unknown) {
            spinner.fail(chalk.red('Failed to initialize project memory'));
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`  ${msg}`));
            process.exit(1);
        }
    });
