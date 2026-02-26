import * as fs from 'fs';
import * as path from 'path';

export interface ChangeInfo {
    name: string;
    dir: string;
    files: string[]; // full paths of proposal.md, design.md, tasks.md etc.
    hasSpecs: boolean;
    specsDir: string;
    tasksFilePath: string | null;
    createdTime: Date | null; // directory creation time (birthtime)
}

export interface SpecInfo {
    name: string;
    filePath: string;
}

export interface ScanResult {
    activeChanges: ChangeInfo[];
    archivedChanges: ChangeInfo[];
    archiveDir: string;
}

const KNOWN_FILES = ['proposal.md', 'design.md', 'tasks.md'];

function isDirectory(p: string): boolean {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

function getCreatedTime(dirPath: string): Date | null {
    try {
        const stat = fs.statSync(dirPath);
        return stat.birthtime;
    } catch {
        return null;
    }
}

function scanChangeDir(changeDir: string, changeName: string): ChangeInfo {
    const files: string[] = [];
    let tasksFilePath: string | null = null;

    for (const fileName of KNOWN_FILES) {
        const filePath = path.join(changeDir, fileName);
        if (fs.existsSync(filePath)) {
            files.push(filePath);
            if (fileName === 'tasks.md') {
                tasksFilePath = filePath;
            }
        }
    }

    const specsDir = path.join(changeDir, 'specs');
    const hasSpecs = isDirectory(specsDir);
    const createdTime = getCreatedTime(changeDir);

    return {
        name: changeName,
        dir: changeDir,
        files,
        hasSpecs,
        specsDir,
        tasksFilePath,
        createdTime,
    };
}

export function scanSpecs(specsDir: string): SpecInfo[] {
    const specs: SpecInfo[] = [];
    if (!isDirectory(specsDir)) {
        return specs;
    }

    try {
        const entries = fs.readdirSync(specsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const specFile = path.join(specsDir, entry.name, 'spec.md');
                if (fs.existsSync(specFile)) {
                    specs.push({ name: entry.name, filePath: specFile });
                }
            }
        }
    } catch {
        // ignore read errors
    }

    return specs;
}

export function scanOpenSpec(workspaceRoot: string): ScanResult | null {
    const changesDir = path.join(workspaceRoot, 'openspec', 'changes');
    if (!isDirectory(changesDir)) {
        return null;
    }

    const activeChanges: ChangeInfo[] = [];
    const archivedChanges: ChangeInfo[] = [];
    const archiveDir = path.join(changesDir, 'archive');

    try {
        const entries = fs.readdirSync(changesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            if (entry.name === 'archive') {
                // Scan archive subdirectories
                if (isDirectory(archiveDir)) {
                    try {
                        const archiveEntries = fs.readdirSync(archiveDir, { withFileTypes: true });
                        for (const archEntry of archiveEntries) {
                            if (archEntry.isDirectory()) {
                                const changeDir = path.join(archiveDir, archEntry.name);
                                archivedChanges.push(scanChangeDir(changeDir, archEntry.name));
                            }
                        }
                    } catch {
                        // ignore
                    }
                }
                continue;
            }

            // Skip hidden directories
            if (entry.name.startsWith('.')) {
                continue;
            }

            const changeDir = path.join(changesDir, entry.name);
            activeChanges.push(scanChangeDir(changeDir, entry.name));
        }
    } catch {
        // ignore read errors
    }

    // Sort by creation time descending (newest first)
    const sortByTimeDesc = (a: ChangeInfo, b: ChangeInfo): number => {
        const timeA = a.createdTime ? a.createdTime.getTime() : 0;
        const timeB = b.createdTime ? b.createdTime.getTime() : 0;
        return timeB - timeA;
    };
    activeChanges.sort(sortByTimeDesc);
    archivedChanges.sort(sortByTimeDesc);

    return { activeChanges, archivedChanges, archiveDir };
}
