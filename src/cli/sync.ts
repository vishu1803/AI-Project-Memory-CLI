import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getDiffSummary, getCurrentCommit, setLastSyncCommit, getDependencyChanges } from '../core/git.js';
import { readMemory, updateMemory, MEMORY_FILES, type ChangeLogEntry, type Feature, buildArchitectureFromProject } from '../core/memory.js';
import { scanProject } from '../core/scanner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

function toFeatureName(segment: string): string {
    return segment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function detectFeatureCandidates(files: string[]): Feature[] {
    const featureMap = new Map<string, Set<string>>();

    for (const file of files) {
        const parts = file.split('/');
        if (parts.length < 2) continue;

        const [root, segment] = parts;
        if (!segment) continue;

        if (root === 'src' || root === 'app' || root === 'modules' || root === 'features') {
            const key = `${root}/${segment}`;
            if (!featureMap.has(key)) featureMap.set(key, new Set<string>());
            featureMap.get(key)?.add(file);
        }
    }

    return [...featureMap.entries()].map(([key, filesSet]) => {
        const name = toFeatureName(key.split('/')[1]);
        return {
            name,
            description: `Detected structural feature candidate from ${key}`,
            status: 'planned' as const,
            files: [...filesSet].slice(0, 20),
        };
    });
}

export const syncCommand = new Command('sync')
    .description('Sync memory with latest git changes (AI-free, deterministic)')
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

            spinner.text = 'Updating architecture snapshot...';
            const info = scanProject(rootDir);
            const architecture = buildArchitectureFromProject(info);
            const dependencyChanges = await getDependencyChanges(rootDir);

            const memory = readMemory(rootDir);
            const existingNames = new Set(memory.features.map(f => f.name.toLowerCase()));
            const candidates = detectFeatureCandidates([...diff.addedFiles, ...diff.modifiedFiles])
                .filter(feature => !existingNames.has(feature.name.toLowerCase()));

            const combinedFeatures = [...memory.features, ...candidates];

            const changeLogEntry: ChangeLogEntry = {
                date: new Date().toISOString(),
                commit: diff.commit,
                summary: `A:${diff.addedFiles.length} M:${diff.modifiedFiles.length} D:${diff.deletedFiles.length} across ${diff.filesChanged.length} files`,
                filesChanged: diff.filesChanged,
                addedFiles: diff.addedFiles,
                modifiedFiles: diff.modifiedFiles,
                deletedFiles: diff.deletedFiles,
                dependencyChanges,
            };

            updateMemory(rootDir, {
                architecture,
                features: combinedFeatures,
                changeLogEntry,
            });

            const currentHash = await getCurrentCommit(rootDir);
            await setLastSyncCommit(rootDir, currentHash);

            spinner.succeed(chalk.green('Memory synced successfully (AI-free).'));
            console.log('');
            console.log(chalk.dim(`  Commit: ${currentHash.slice(0, 8)}`));
            console.log(chalk.dim(`  Files changed: ${diff.filesChanged.length} (A:${diff.addedFiles.length} M:${diff.modifiedFiles.length} D:${diff.deletedFiles.length})`));
            console.log(chalk.dim(`  Insertions: +${diff.insertions}  Deletions: -${diff.deletions}`));
            console.log(chalk.dim(`  Feature candidates added: ${candidates.length}`));
            console.log(chalk.dim(`  Dependency changes: +${dependencyChanges.added.length} ~${dependencyChanges.updated.length} -${dependencyChanges.removed.length}`));
            console.log('');
        } catch (error: unknown) {
            spinner.fail(chalk.red('Sync failed'));
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`  ${msg}`));
            process.exit(1);
        }
    });
