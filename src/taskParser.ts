import * as fs from 'fs';

export interface ParsedTaskItem {
    text: string;
    done: boolean;
    lineNumber: number; // 1-based
    indent: number;
    children: ParsedTaskItem[];
}

export interface ParsedTaskSection {
    title: string;
    lineNumber: number; // 1-based
    items: ParsedTaskItem[];
    completed: number;
    total: number;
}

export interface ParsedTasks {
    sections: ParsedTaskSection[];
    completed: number;
    total: number;
}

const CHECKBOX_RE = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
const SECTION_RE = /^##\s+(.+)$/;

function getIndentLevel(spaces: string): number {
    // Normalize tabs to 2 spaces
    const normalized = spaces.replace(/\t/g, '  ');
    return Math.floor(normalized.length / 2);
}

function countCheckboxes(items: ParsedTaskItem[]): { completed: number; total: number } {
    let completed = 0;
    let total = 0;
    for (const item of items) {
        total++;
        if (item.done) {
            completed++;
        }
        const childCounts = countCheckboxes(item.children);
        completed += childCounts.completed;
        total += childCounts.total;
    }
    return { completed, total };
}

function buildNestedItems(flatItems: { text: string; done: boolean; lineNumber: number; indent: number }[]): ParsedTaskItem[] {
    const roots: ParsedTaskItem[] = [];
    const stack: ParsedTaskItem[] = [];

    for (const flat of flatItems) {
        const item: ParsedTaskItem = {
            text: flat.text,
            done: flat.done,
            lineNumber: flat.lineNumber,
            indent: flat.indent,
            children: [],
        };

        // Pop stack until we find a parent with smaller indent
        while (stack.length > 0 && stack[stack.length - 1].indent >= flat.indent) {
            stack.pop();
        }

        if (stack.length === 0) {
            roots.push(item);
        } else {
            stack[stack.length - 1].children.push(item);
        }

        stack.push(item);
    }

    return roots;
}

export function parseTasksFile(filePath: string): ParsedTasks {
    if (!fs.existsSync(filePath)) {
        return { sections: [], completed: 0, total: 0 };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    const sections: ParsedTaskSection[] = [];
    let currentSection: { title: string; lineNumber: number; flatItems: { text: string; done: boolean; lineNumber: number; indent: number }[] } | null = null;

    const finishSection = () => {
        if (currentSection) {
            const nestedItems = buildNestedItems(currentSection.flatItems);
            const counts = countCheckboxes(nestedItems);
            sections.push({
                title: currentSection.title,
                lineNumber: currentSection.lineNumber,
                items: nestedItems,
                completed: counts.completed,
                total: counts.total,
            });
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1; // 1-based

        const sectionMatch = line.match(SECTION_RE);
        if (sectionMatch) {
            finishSection();
            currentSection = {
                title: sectionMatch[1].trim(),
                lineNumber: lineNum,
                flatItems: [],
            };
            continue;
        }

        const checkboxMatch = line.match(CHECKBOX_RE);
        if (checkboxMatch) {
            // If no section yet, create a default one
            if (!currentSection) {
                currentSection = {
                    title: 'Tasks',
                    lineNumber: 1,
                    flatItems: [],
                };
            }

            const indent = getIndentLevel(checkboxMatch[1]);
            const done = checkboxMatch[2].toLowerCase() === 'x';
            const text = checkboxMatch[3].trim();

            currentSection.flatItems.push({ text, done, lineNumber: lineNum, indent });
        }
        // Ignore empty lines and non-checkbox lines
    }

    // Finish last section
    finishSection();

    // Calculate overall totals
    let totalCompleted = 0;
    let totalAll = 0;
    for (const section of sections) {
        totalCompleted += section.completed;
        totalAll += section.total;
    }

    return {
        sections,
        completed: totalCompleted,
        total: totalAll,
    };
}
