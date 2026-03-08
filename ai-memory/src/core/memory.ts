import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectInfo } from './scanner.js';

const MEMORY_DIR = '.ai-memory';

export const MEMORY_FILES = {
    dir: MEMORY_DIR,
    projectSummary: path.join(MEMORY_DIR, 'project-summary.md'),
    architecture: path.join(MEMORY_DIR, 'architecture.json'),
    features: path.join(MEMORY_DIR, 'features.json'),
    decisions: path.join(MEMORY_DIR, 'decisions.md'),
    changeLog: path.join(MEMORY_DIR, 'change-log.json'),
    lastSync: path.join(MEMORY_DIR, '.last-sync'),
} as const;

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function writeJSON(filePath: string, data: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function readJSON<T>(filePath: string): T | null {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
        return null;
    }
}

function readText(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return '';
    }
}

export interface Architecture {
    framework: string;
    languages: string[];
    directories: Record<string, string>;
    entryPoints: string[];
    dependencies: string[];
    devDependencies: string[];
}

export interface Feature {
    name: string;
    description: string;
    status: 'active' | 'planned' | 'deprecated';
    files: string[];
}

export interface ChangeLogEntry {
    date: string;
    commit: string;
    summary: string;
    filesChanged: string[];
    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    dependencyChanges?: {
        added: string[];
        removed: string[];
        updated: string[];
    };
}

export interface Memory {
    projectSummary: string;
    architecture: Architecture;
    features: Feature[];
    decisions: string;
    changeLog: ChangeLogEntry[];
}

export function buildArchitectureFromProject(info: ProjectInfo): Architecture {
    const dirMap: Record<string, string> = {};
    for (const d of info.structure.directories) {
        const base = d.split(path.sep)[0] || d;
        if (!dirMap[base]) {
            dirMap[base] = guessDirectoryPurpose(base);
        }
    }

    return {
        framework: info.framework,
        languages: detectLanguages(info.structure.files),
        directories: dirMap,
        entryPoints: guessEntryPoints(info.structure.files),
        dependencies: Object.keys(info.dependencies).sort(),
        devDependencies: Object.keys(info.devDependencies).sort(),
    };
}

export function initMemory(rootDir: string, info: ProjectInfo): void {
    const memDir = path.join(rootDir, MEMORY_FILES.dir);
    ensureDir(memDir);

<<<<<<<< HEAD:ai memory/src/core/memory.ts
    const architecture = buildArchitectureFromProject(info);
    const keyDirectories = info.structure.directories
        .filter(dir => {
            const normalized = dir.toLowerCase();
            return normalized.startsWith('src')
                || normalized.startsWith('app')
                || normalized.startsWith('routes')
                || normalized.startsWith('services')
                || normalized.startsWith('utils')
                || normalized.startsWith('lib')
                || normalized.startsWith('controllers');
        })
        .slice(0, 30);

    const mainDependencies = Object.keys(info.dependencies).slice(0, 20);

========
>>>>>>>> main:ai-memory/src/core/memory.ts
    const summaryLines = [
        `# ${info.name}`,
        '',
        info.description ? `> ${info.description}` : '> _No description provided._',
        '',
<<<<<<<< HEAD:ai memory/src/core/memory.ts
        `Project Type: ${info.projectType}`,
        `Language: ${info.primaryLanguage}`,
        `Framework: ${info.framework}`,
        `Package Manager: ${info.packageManager}`,
        '',
        'Key Directories:',
        ...(keyDirectories.length > 0 ? keyDirectories.map(dir => `${dir}/`) : ['(none detected)']),
        '',
        'Entry Points:',
        ...(architecture.entryPoints.length > 0 ? architecture.entryPoints : ['(none detected)']),
        '',
        'Main Dependencies:',
        ...(mainDependencies.length > 0 ? mainDependencies : ['(none detected)']),
========
        `- **Project Type:** ${info.framework}`,
        `- **Languages:** ${detectLanguages(info.structure.files).join(', ') || 'Unknown'}`,
        `- **Dependencies:** ${Object.keys(info.dependencies).length}`,
        `- **Dev Dependencies:** ${Object.keys(info.devDependencies).length}`,
        '',
        '## Major Dependencies',
        '',
        ...Object.entries(info.dependencies).slice(0, 20).map(([k, v]) => `- \`${k}\` ${v}`),
        '',
        '## Directory Structure',
        '',
        ...info.structure.directories.slice(0, 80).map(d => `- 📁 \`${d}/\``),
>>>>>>>> main:ai-memory/src/core/memory.ts
        '',
    ];
    fs.writeFileSync(path.join(rootDir, MEMORY_FILES.projectSummary), summaryLines.join('\n'), 'utf-8');

<<<<<<<< HEAD:ai memory/src/core/memory.ts
    writeJSON(path.join(rootDir, MEMORY_FILES.architecture), architecture);
========
    writeJSON(path.join(rootDir, MEMORY_FILES.architecture), buildArchitectureFromProject(info));
>>>>>>>> main:ai-memory/src/core/memory.ts

    const features: Feature[] = [
        {
            name: 'Core',
            description: `Core ${info.framework} project structure`,
            status: 'active',
            files: info.structure.files.slice(0, 10),
        },
    ];
    writeJSON(path.join(rootDir, MEMORY_FILES.features), features);

    const decisionsContent = [
        '# Architectural Decisions',
        '',
        `## ${new Date().toISOString().split('T')[0]}`,
        '',
        '- Initialized deterministic project memory (AI-free engine).',
        '',
    ].join('\n');
    fs.writeFileSync(path.join(rootDir, MEMORY_FILES.decisions), decisionsContent, 'utf-8');

    writeJSON(path.join(rootDir, MEMORY_FILES.changeLog), []);
}

export function readMemory(rootDir: string): Memory {
    return {
        projectSummary: readText(path.join(rootDir, MEMORY_FILES.projectSummary)),
        architecture: readJSON<Architecture>(path.join(rootDir, MEMORY_FILES.architecture)) || {
            framework: 'unknown',
            languages: [],
            directories: {},
            entryPoints: [],
            dependencies: [],
            devDependencies: [],
        },
        features: readJSON<Feature[]>(path.join(rootDir, MEMORY_FILES.features)) || [],
        decisions: readText(path.join(rootDir, MEMORY_FILES.decisions)),
        changeLog: readJSON<ChangeLogEntry[]>(path.join(rootDir, MEMORY_FILES.changeLog)) || [],
    };
}

export interface MemoryUpdate {
    architecture?: Partial<Architecture>;
    features?: Feature[];
    changeLogEntry?: ChangeLogEntry;
}

export function updateMemory(rootDir: string, update: MemoryUpdate): void {
    if (update.architecture) {
        const current = readJSON<Architecture>(path.join(rootDir, MEMORY_FILES.architecture)) || {
            framework: 'unknown', languages: [], directories: {}, entryPoints: [], dependencies: [], devDependencies: [],
        };
        const merged: Architecture = {
            ...current,
            ...update.architecture,
            directories: { ...current.directories, ...update.architecture.directories },
            languages: [...new Set([...current.languages, ...(update.architecture.languages || [])])],
            dependencies: [...new Set([...current.dependencies, ...(update.architecture.dependencies || [])])],
            devDependencies: [...new Set([...current.devDependencies, ...(update.architecture.devDependencies || [])])],
        };
        writeJSON(path.join(rootDir, MEMORY_FILES.architecture), merged);
    }

    if (update.features) {
        writeJSON(path.join(rootDir, MEMORY_FILES.features), update.features);
    }

    if (update.changeLogEntry) {
        const log = readJSON<ChangeLogEntry[]>(path.join(rootDir, MEMORY_FILES.changeLog)) || [];
        log.unshift(update.changeLogEntry);
        writeJSON(path.join(rootDir, MEMORY_FILES.changeLog), log);
    }
}

export function appendDecision(rootDir: string, text: string): void {
    const memDir = path.join(rootDir, MEMORY_FILES.dir);
    ensureDir(memDir);

    const filePath = path.join(rootDir, MEMORY_FILES.decisions);
    const timestamp = new Date().toISOString();
    const entry = `\n- **[${timestamp}]** ${text}\n`;

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '# Architectural Decisions\n' + entry, 'utf-8');
    } else {
        fs.appendFileSync(filePath, entry, 'utf-8');
    }
}

function detectLanguages(files: string[]): string[] {
    const extMap: Record<string, string> = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript (JSX)', '.js': 'JavaScript',
        '.jsx': 'JavaScript (JSX)', '.py': 'Python', '.go': 'Go',
        '.rs': 'Rust', '.java': 'Java', '.rb': 'Ruby', '.css': 'CSS',
        '.scss': 'SCSS', '.html': 'HTML', '.vue': 'Vue SFC',
        '.svelte': 'Svelte', '.md': 'Markdown', '.json': 'JSON',
    };
    const langs = new Set<string>();
    for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (extMap[ext]) langs.add(extMap[ext]);
    }
    return [...langs];
}

function guessEntryPoints(files: string[]): string[] {
    const candidates = [
        'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
        'src/app.ts', 'src/app.js', 'index.ts', 'index.js',
        'src/server.ts', 'src/server.js', 'pages/index.tsx', 'app/page.tsx',
    ];
    return candidates.filter(c => files.includes(c));
}

function guessDirectoryPurpose(dirName: string): string {
    const map: Record<string, string> = {
        src: 'Source code', lib: 'Library code', core: 'Core logic',
        cli: 'CLI commands', ai: 'AI integration', api: 'API routes',
        components: 'UI components', pages: 'Page routes', app: 'App directory',
        utils: 'Utility helpers', hooks: 'Custom hooks', services: 'Service layer',
        models: 'Data models', types: 'Type definitions', config: 'Configuration',
        test: 'Tests', tests: 'Tests', __tests__: 'Tests', spec: 'Tests',
        scripts: 'Build/utility scripts', public: 'Static assets',
        assets: 'Media assets', styles: 'Stylesheets', docs: 'Documentation',
        middleware: 'Middleware', routes: 'Route handlers', controllers: 'Controllers',
        modules: 'Feature modules', prisma: 'Prisma schema & migrations',
    };
    return map[dirName.toLowerCase()] || 'Project directory';
}
