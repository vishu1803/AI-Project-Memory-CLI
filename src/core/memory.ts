import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectInfo } from './scanner.js';

// ── Paths ──────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────

export interface Architecture {
    framework: string;
    languages: string[];
    directories: Record<string, string>;
    entryPoints: string[];
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
}

export interface Memory {
    projectSummary: string;
    architecture: Architecture;
    features: Feature[];
    decisions: string;
    changeLog: ChangeLogEntry[];
}

// ── Init ───────────────────────────────────────────────────────────────

export function initMemory(rootDir: string, info: ProjectInfo): void {
    const memDir = path.join(rootDir, MEMORY_FILES.dir);
    ensureDir(memDir);

    // project-summary.md
    const summaryLines = [
        `# ${info.name}`,
        '',
        info.description ? `> ${info.description}` : '> _No description provided._',
        '',
        `- **Version:** ${info.version}`,
        `- **Framework:** ${info.framework}`,
        `- **Dependencies:** ${Object.keys(info.dependencies).length}`,
        `- **Dev Dependencies:** ${Object.keys(info.devDependencies).length}`,
        '',
        '## Key Dependencies',
        '',
        ...Object.entries(info.dependencies).map(([k, v]) => `- \`${k}\` ${v}`),
        '',
        '## Directory Structure',
        '',
        ...info.structure.directories.map(d => `- 📁 \`${d}/\``),
        '',
    ];
    fs.writeFileSync(path.join(rootDir, MEMORY_FILES.projectSummary), summaryLines.join('\n'), 'utf-8');

    // architecture.json
    const dirMap: Record<string, string> = {};
    for (const d of info.structure.directories) {
        const base = d.split(path.sep)[0] || d;
        if (!dirMap[base]) {
            dirMap[base] = guessDirectoryPurpose(base);
        }
    }

    const architecture: Architecture = {
        framework: info.framework,
        languages: detectLanguages(info.structure.files),
        directories: dirMap,
        entryPoints: guessEntryPoints(info.structure.files),
    };
    writeJSON(path.join(rootDir, MEMORY_FILES.architecture), architecture);

    // features.json
    const features: Feature[] = [
        {
            name: 'Core',
            description: `Main ${info.framework} application`,
            status: 'active',
            files: info.structure.files.slice(0, 10),
        },
    ];
    writeJSON(path.join(rootDir, MEMORY_FILES.features), features);

    // decisions.md
    const decisionsContent = [
        '# Architectural Decisions',
        '',
        `## ${new Date().toISOString().split('T')[0]}`,
        '',
        `- Project initialized with ai-memory. Framework detected: **${info.framework}**.`,
        '',
    ].join('\n');
    fs.writeFileSync(path.join(rootDir, MEMORY_FILES.decisions), decisionsContent, 'utf-8');

    // change-log.json
    writeJSON(path.join(rootDir, MEMORY_FILES.changeLog), []);
}

// ── Read ───────────────────────────────────────────────────────────────

export function readMemory(rootDir: string): Memory {
    return {
        projectSummary: readText(path.join(rootDir, MEMORY_FILES.projectSummary)),
        architecture: readJSON<Architecture>(path.join(rootDir, MEMORY_FILES.architecture)) || {
            framework: 'unknown',
            languages: [],
            directories: {},
            entryPoints: [],
        },
        features: readJSON<Feature[]>(path.join(rootDir, MEMORY_FILES.features)) || [],
        decisions: readText(path.join(rootDir, MEMORY_FILES.decisions)),
        changeLog: readJSON<ChangeLogEntry[]>(path.join(rootDir, MEMORY_FILES.changeLog)) || [],
    };
}

// ── Update ─────────────────────────────────────────────────────────────

export interface MemoryUpdate {
    architecture?: Partial<Architecture>;
    features?: Feature[];
    changeLogEntry?: ChangeLogEntry;
}

export function updateMemory(rootDir: string, update: MemoryUpdate): void {
    if (update.architecture) {
        const current = readJSON<Architecture>(path.join(rootDir, MEMORY_FILES.architecture)) || {
            framework: 'unknown', languages: [], directories: {}, entryPoints: [],
        };
        const merged: Architecture = {
            ...current,
            ...update.architecture,
            directories: { ...current.directories, ...update.architecture.directories },
            languages: [...new Set([...current.languages, ...(update.architecture.languages || [])])],
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

// ── Decision ───────────────────────────────────────────────────────────

export function appendDecision(rootDir: string, text: string): void {
    const filePath = path.join(rootDir, MEMORY_FILES.decisions);
    const timestamp = new Date().toISOString();
    const entry = `\n- **[${timestamp}]** ${text}\n`;

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '# Architectural Decisions\n' + entry, 'utf-8');
    } else {
        fs.appendFileSync(filePath, entry, 'utf-8');
    }
}

// ── Detection helpers ──────────────────────────────────────────────────

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
