import * as vscode from 'vscode';

export class OpenSpecWatcher implements vscode.Disposable {
    private watchers: vscode.FileSystemWatcher[] = [];
    private debounceTimer: NodeJS.Timeout | undefined;
    private workspaceFolderDisposable: vscode.Disposable | undefined;

    constructor(private readonly onRefresh: () => void) {
        this.createWatchers();
        this.workspaceFolderDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.recreateWatchers();
            this.triggerRefresh();
        });
    }

    private createWatchers(): void {
        const pattern = new vscode.RelativePattern(
            // Watch all workspace folders
            { uri: vscode.Uri.file('/'), name: '' } as vscode.WorkspaceFolder,
            '**/openspec/**'
        );

        // Create per-workspace-folder watchers for better scoping
        const folders = vscode.workspace.workspaceFolders || [];
        for (const folder of folders) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder, 'openspec/**')
            );
            watcher.onDidCreate(() => this.triggerRefresh());
            watcher.onDidChange(() => this.triggerRefresh());
            watcher.onDidDelete(() => this.triggerRefresh());
            this.watchers.push(watcher);
        }
    }

    private recreateWatchers(): void {
        this.disposeWatchers();
        this.createWatchers();
    }

    private triggerRefresh(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.onRefresh();
        }, 300);
    }

    private disposeWatchers(): void {
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
    }

    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.disposeWatchers();
        this.workspaceFolderDisposable?.dispose();
    }
}
