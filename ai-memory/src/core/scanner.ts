import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProjectStructure {
    directories: string[];
    files: string[];
}

export interface ProjectInfo {
    name: string;
    version: string;
    description: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    framework: string;
    structure: ProjectStructure;
}

const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.ai-memory', 'dist', 'build',
    '.next', '.nuxt', '.svelte-kit', 'coverage', '__pycache__',
    '.cache', '.parcel-cache', '.turbo',
]);

const IGNORE_FILES = new Set([
    '.DS_Store', 'Thumbs.db', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
]);

function detectFramework(deps: Record<string, string>, devDeps: Record<string, string>): string {
    const all = { ...deps, ...devDeps };

    if (all['next']) return 'Next.js';
    if (all['nuxt'] || all['nuxt3']) return 'Nuxt';
    if (all['@angular/core']) return 'Angular';
    if (all['svelte'] || all['@sveltejs/kit']) return 'Svelte / SvelteKit';
    if (all['vue']) return 'Vue';
    if (all['react']) return 'React';
    if (all['@nestjs/core']) return 'NestJS';
    if (all['express']) return 'Express';
    if (all['fastify']) return 'Fastify';
    if (all['hono']) return 'Hono';
    if (all['electron']) return 'Electron';
    if (all['react-native']) return 'React Native';
    if (all['typescript']) return 'TypeScript (generic)';
    return 'Node.js';
}

function walkDir(dir: string, rootDir: string, maxDepth = 4, currentDepth = 0): ProjectStructure {
    const structure: ProjectStructure = { directories: [], files: [] };

    if (currentDepth > maxDepth) return structure;

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return structure;
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            const relPath = path.relative(rootDir, path.join(dir, entry.name));
            structure.directories.push(relPath);
            const sub = walkDir(path.join(dir, entry.name), rootDir, maxDepth, currentDepth + 1);
            structure.directories.push(...sub.directories);
            structure.files.push(...sub.files);
        } else if (entry.isFile()) {
            if (IGNORE_FILES.has(entry.name)) continue;
            const relPath = path.relative(rootDir, path.join(dir, entry.name));
            structure.files.push(relPath);
        }
    }

    return structure;
}

export function scanProject(rootDir: string): ProjectInfo {
    const pkgPath = path.join(rootDir, 'package.json');

    let name = path.basename(rootDir);
    let version = '0.0.0';
    let description = '';
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};

    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            name = pkg.name || name;
            version = pkg.version || version;
            description = pkg.description || '';
            dependencies = pkg.dependencies || {};
            devDependencies = pkg.devDependencies || {};
        } catch {
            // ignore parse errors
        }
    }

    const framework = detectFramework(dependencies, devDependencies);
    const structure = walkDir(rootDir, rootDir);

    return {
        name,
        version,
        description,
        dependencies,
        devDependencies,
        framework,
        structure,
    };
}
