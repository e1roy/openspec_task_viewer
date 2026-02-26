import * as vscode from 'vscode';
import {
    OpenSpecTreeNode,
    WorkspaceNode,
    ChangeNode,
    ArchivedGroupNode,
    ArchivedChangeNode,
    FileNode,
    SpecsFolderNode,
    SpecNode,
    TaskSummaryNode,
    TaskSectionNode,
    TaskItemNode,
    NodeType,
} from './nodes';
import { scanOpenSpec, scanSpecs, ChangeInfo } from './openspecScanner';
import { parseTasksFile, ParsedTaskItem, ParsedTasks } from './taskParser';

export class OpenSpecTreeProvider implements vscode.TreeDataProvider<OpenSpecTreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<OpenSpecTreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: OpenSpecTreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: OpenSpecTreeNode): vscode.ProviderResult<OpenSpecTreeNode[]> {
        if (!element) {
            return this.getRootChildren();
        }

        switch (element.nodeType) {
            case NodeType.Workspace:
                return this.getWorkspaceChildren(element as WorkspaceNode);
            case NodeType.Change:
            case NodeType.ArchivedChange:
                return this.getChangeChildren(element as ChangeNode | ArchivedChangeNode);
            case NodeType.ArchivedGroup:
                return this.getArchivedGroupChildren(element as ArchivedGroupNode);
            case NodeType.SpecsFolder:
                return this.getSpecsFolderChildren(element as SpecsFolderNode);
            case NodeType.TaskSummary:
                return this.getTaskSummaryChildren(element as TaskSummaryNode);
            case NodeType.TaskSection:
                return this.getTaskSectionChildren(element as TaskSectionNode);
            case NodeType.TaskItem:
                return this.getTaskItemChildren(element as TaskItemNode);
            default:
                return [];
        }
    }

    private getRootChildren(): OpenSpecTreeNode[] {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return [];
        }

        // Find workspace folders that contain openspec/changes/
        const validFolders: { folder: vscode.WorkspaceFolder; changesDir: string }[] = [];
        for (const folder of folders) {
            const result = scanOpenSpec(folder.uri.fsPath);
            if (result) {
                validFolders.push({
                    folder,
                    changesDir: folder.uri.fsPath,
                });
            }
        }

        if (validFolders.length === 0) {
            return [];
        }

        // Single workspace: skip workspace layer
        if (validFolders.length === 1) {
            return this.buildChangesNodes(validFolders[0].folder.uri.fsPath);
        }

        // Multiple workspaces: show workspace nodes
        return validFolders.map(
            (vf) => new WorkspaceNode(vf.folder, vf.changesDir)
        );
    }

    private getWorkspaceChildren(node: WorkspaceNode): OpenSpecTreeNode[] {
        return this.buildChangesNodes(node.workspaceFolder.uri.fsPath);
    }

    private getTaskStats(change: ChangeInfo): { completed: number; total: number } {
        if (change.tasksFilePath) {
            const parsed = parseTasksFile(change.tasksFilePath);
            return { completed: parsed.completed, total: parsed.total };
        }
        return { completed: 0, total: 0 };
    }

    private buildChangesNodes(workspaceRoot: string): OpenSpecTreeNode[] {
        const result = scanOpenSpec(workspaceRoot);
        if (!result) {
            return [];
        }

        const nodes: OpenSpecTreeNode[] = [];

        // Active changes (already sorted newest-first by scanner)
        for (const change of result.activeChanges) {
            const stats = this.getTaskStats(change);
            nodes.push(new ChangeNode(change.name, change.dir, change.createdTime, stats.completed, stats.total));
        }

        // Archived group (only if there are archived changes)
        if (result.archivedChanges.length > 0) {
            nodes.push(new ArchivedGroupNode(result.archiveDir));
        }

        return nodes;
    }

    private getChangeChildren(node: ChangeNode | ArchivedChangeNode): OpenSpecTreeNode[] {
        const result = scanOpenSpec(this.findWorkspaceRoot(node.changeDir));
        if (!result) {
            return [];
        }

        const allChanges = [...result.activeChanges, ...result.archivedChanges];
        const changeInfo = allChanges.find((c) => c.dir === node.changeDir);
        if (!changeInfo) {
            return [];
        }

        const nodes: OpenSpecTreeNode[] = [];

        // File nodes (proposal.md, design.md, tasks.md)
        for (const filePath of changeInfo.files) {
            nodes.push(new FileNode(filePath));
        }

        // Specs folder
        if (changeInfo.hasSpecs) {
            const specs = scanSpecs(changeInfo.specsDir);
            if (specs.length > 0) {
                nodes.push(new SpecsFolderNode(changeInfo.specsDir));
            }
        }

        // Task summary (parsed from tasks.md)
        if (changeInfo.tasksFilePath) {
            const parsed = parseTasksFile(changeInfo.tasksFilePath);
            if (parsed.total > 0) {
                const sectionNodes = parsed.sections.map((section) => {
                    const sectionNode = new TaskSectionNode(
                        section.title,
                        section.lineNumber,
                        changeInfo.tasksFilePath!,
                        section.completed,
                        section.total,
                    );
                    sectionNode.children = this.buildTaskItemNodes(section.items, changeInfo.tasksFilePath!);
                    return sectionNode;
                });

                nodes.push(
                    new TaskSummaryNode(
                        changeInfo.tasksFilePath,
                        sectionNodes,
                        parsed.completed,
                        parsed.total,
                    )
                );
            }
        }

        return nodes;
    }

    private buildTaskItemNodes(items: ParsedTaskItem[], tasksFilePath: string): TaskItemNode[] {
        return items.map((item) => {
            const node = new TaskItemNode(item.text, item.done, item.lineNumber, tasksFilePath);
            if (item.children.length > 0) {
                node.children = this.buildTaskItemNodes(item.children, tasksFilePath);
                node.updateCollapsibleState();
            }
            return node;
        });
    }

    private getArchivedGroupChildren(node: ArchivedGroupNode): OpenSpecTreeNode[] {
        const workspaceRoot = this.findWorkspaceRoot(node.archiveDir);
        const result = scanOpenSpec(workspaceRoot);
        if (!result) {
            return [];
        }

        return result.archivedChanges.map((change) => {
            const stats = this.getTaskStats(change);
            return new ArchivedChangeNode(change.name, change.dir, change.createdTime, stats.completed, stats.total);
        });
    }

    private getSpecsFolderChildren(node: SpecsFolderNode): OpenSpecTreeNode[] {
        const specs = scanSpecs(node.specsDir);
        return specs.map((spec) => new SpecNode(spec.name, spec.filePath));
    }

    private getTaskSummaryChildren(node: TaskSummaryNode): OpenSpecTreeNode[] {
        return node.sections;
    }

    private getTaskSectionChildren(node: TaskSectionNode): OpenSpecTreeNode[] {
        return node.children;
    }

    private getTaskItemChildren(node: TaskItemNode): OpenSpecTreeNode[] {
        return node.children;
    }

    private findWorkspaceRoot(somePath: string): string {
        const folders = vscode.workspace.workspaceFolders || [];
        for (const folder of folders) {
            const root = folder.uri.fsPath;
            if (somePath.startsWith(root)) {
                return root;
            }
        }
        // Fallback: try to find openspec in the path
        const openspecIdx = somePath.indexOf('openspec');
        if (openspecIdx > 0) {
            return somePath.substring(0, openspecIdx - 1);
        }
        return somePath;
    }
}
