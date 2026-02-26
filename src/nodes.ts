import * as vscode from 'vscode';
import * as path from 'path';

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
}

export enum NodeType {
    Workspace = 'workspace',
    Change = 'change',
    ArchivedGroup = 'archivedGroup',
    ArchivedChange = 'archivedChange',
    File = 'file',
    SpecsFolder = 'specsFolder',
    Spec = 'spec',
    TaskSummary = 'taskSummary',
    TaskSection = 'taskSection',
    TaskItem = 'taskItem',
}

export class WorkspaceNode extends vscode.TreeItem {
    readonly nodeType = NodeType.Workspace;
    constructor(
        public readonly workspaceFolder: vscode.WorkspaceFolder,
        public readonly changesDir: string,
    ) {
        super(workspaceFolder.name, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('root-folder');
        this.contextValue = 'workspace';
    }
}

export class ChangeNode extends vscode.TreeItem {
    readonly nodeType = NodeType.Change;
    constructor(
        public readonly changeName: string,
        public readonly changeDir: string,
        public readonly createdTime: Date | null,
        public readonly taskCompleted: number,
        public readonly taskTotal: number,
    ) {
        super(changeName, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('git-compare');
        this.contextValue = 'change';

        // Build tooltip as MarkdownString for rich hover
        const md = new vscode.MarkdownString('', true);
        md.isTrusted = true;
        md.supportHtml = true;

        md.appendMarkdown(`**${changeName}**\n\n`);
        if (createdTime) {
            md.appendMarkdown(`$(calendar) Created: ${formatDate(createdTime)}\n\n`);
        }
        if (taskTotal > 0) {
            md.appendMarkdown(`$(tasklist) Tasks: ${taskCompleted}/${taskTotal}`);
            if (taskCompleted === taskTotal) {
                md.appendMarkdown(` $(check)`);
            }
        } else {
            md.appendMarkdown(`$(tasklist) Tasks: none`);
        }
        this.tooltip = md;
    }
}

export class ArchivedGroupNode extends vscode.TreeItem {
    readonly nodeType = NodeType.ArchivedGroup;
    constructor(public readonly archiveDir: string) {
        super('Archived Changes', vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('library');
        this.contextValue = 'archivedGroup';
    }
}

export class ArchivedChangeNode extends vscode.TreeItem {
    readonly nodeType = NodeType.ArchivedChange;
    constructor(
        public readonly changeName: string,
        public readonly changeDir: string,
        public readonly createdTime: Date | null,
        public readonly taskCompleted: number,
        public readonly taskTotal: number,
    ) {
        super(changeName, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('archive');
        this.contextValue = 'archivedChange';

        const md = new vscode.MarkdownString('', true);
        md.isTrusted = true;
        md.supportHtml = true;

        md.appendMarkdown(`**${changeName}** *(archived)*\n\n`);
        if (createdTime) {
            md.appendMarkdown(`$(calendar) Created: ${formatDate(createdTime)}\n\n`);
        }
        if (taskTotal > 0) {
            md.appendMarkdown(`$(tasklist) Tasks: ${taskCompleted}/${taskTotal}`);
            if (taskCompleted === taskTotal) {
                md.appendMarkdown(` $(check)`);
            }
        } else {
            md.appendMarkdown(`$(tasklist) Tasks: none`);
        }
        this.tooltip = md;
    }
}

export class FileNode extends vscode.TreeItem {
    readonly nodeType = NodeType.File;
    constructor(
        public readonly filePath: string,
    ) {
        const fileName = path.basename(filePath);
        super(fileName, vscode.TreeItemCollapsibleState.None);

        // Use resourceUri so VSCode applies the current file icon theme
        this.resourceUri = vscode.Uri.file(filePath);
        this.contextValue = 'file';

        // Open markdown files in preview mode
        if (fileName.endsWith('.md')) {
            this.command = {
                command: 'markdown.showPreview',
                title: 'Preview Markdown',
                arguments: [vscode.Uri.file(filePath)],
            };
        } else {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(filePath)],
            };
        }
    }
}

export class SpecsFolderNode extends vscode.TreeItem {
    readonly nodeType = NodeType.SpecsFolder;
    constructor(public readonly specsDir: string) {
        super('specs', vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'specsFolder';
    }
}

export class SpecNode extends vscode.TreeItem {
    readonly nodeType = NodeType.Spec;
    constructor(
        public readonly specName: string,
        public readonly specFilePath: string,
    ) {
        super(specName, vscode.TreeItemCollapsibleState.None);
        // Use resourceUri so VSCode applies the current file icon theme
        this.resourceUri = vscode.Uri.file(specFilePath);
        this.contextValue = 'spec';

        // Spec files are .md, open in preview mode
        this.command = {
            command: 'markdown.showPreview',
            title: 'Preview Spec',
            arguments: [vscode.Uri.file(specFilePath)],
        };
    }
}

export class TaskSummaryNode extends vscode.TreeItem {
    readonly nodeType = NodeType.TaskSummary;
    constructor(
        public readonly tasksFilePath: string,
        public readonly sections: TaskSectionNode[],
        public readonly completed: number,
        public readonly total: number,
    ) {
        super('Tasks', vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('tasklist');
        this.description = `[${completed}/${total}]`;
        this.contextValue = 'taskSummary';
    }
}

export class TaskSectionNode extends vscode.TreeItem {
    readonly nodeType = NodeType.TaskSection;
    public children: TaskItemNode[] = [];
    constructor(
        public readonly sectionTitle: string,
        public readonly lineNumber: number,
        public readonly tasksFilePath: string,
        public readonly completed: number,
        public readonly total: number,
    ) {
        super(sectionTitle, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('list-tree');
        this.description = `[${completed}/${total}]`;
        this.contextValue = 'taskSection';
    }
}

export class TaskItemNode extends vscode.TreeItem {
    readonly nodeType = NodeType.TaskItem;
    public children: TaskItemNode[] = [];
    constructor(
        public readonly taskText: string,
        public readonly done: boolean,
        public readonly lineNumber: number,
        public readonly tasksFilePath: string,
    ) {
        const hasChildren = false; // will be updated after construction
        super(taskText, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon(done ? 'pass-filled' : 'circle-large-outline');
        this.contextValue = 'taskItem';

        this.command = {
            command: 'openspecTaskViewer.previewMarkdownAtLine',
            title: 'Preview Task',
            arguments: [vscode.Uri.file(tasksFilePath), lineNumber],
        };
    }

    updateCollapsibleState(): void {
        if (this.children.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        }
    }
}

export type OpenSpecTreeNode =
    | WorkspaceNode
    | ChangeNode
    | ArchivedGroupNode
    | ArchivedChangeNode
    | FileNode
    | SpecsFolderNode
    | SpecNode
    | TaskSummaryNode
    | TaskSectionNode
    | TaskItemNode;
