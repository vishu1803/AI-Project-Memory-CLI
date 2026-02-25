import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '../core/scanner.js';
import { initMemory, MEMORY_FILES } from '../core/memory.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const initCommand = new Command('init')
    .description('Initialize AI memory for the current project')
    .action(async () => {
        const rootDir = process.cwd();
        const memDir = path.join(rootDir, MEMORY_FILES.dir);

        if (fs.existsSync(memDir)) {
            console.log(chalk.yellow('⚠  .ai-memory already exists. Use "ai-memory sync" to update.'));
            return;
        }

        const spinner = ora('Scanning project structure...').start();

        try {
            const info = scanProject(rootDir);
            spinner.text = 'Generating memory files...';
            initMemory(rootDir, info);

            spinner.succeed(chalk.green('AI memory initialized successfully!'));
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
            console.log(chalk.green('✓ Run "ai-memory sync" after your next commit to update memory.'));
        } catch (error: unknown) {
            spinner.fail(chalk.red('Failed to initialize AI memory'));
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`  ${msg}`));
            process.exit(1);
        }
    });
