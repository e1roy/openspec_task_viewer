import * as vscode from 'vscode';
import { OpenSpecTreeProvider } from './openspecTreeProvider';
import { OpenSpecWatcher } from './watcher';

let watcher: OpenSpecWatcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
    const treeProvider = new OpenSpecTreeProvider();

    const treeView = vscode.window.createTreeView('openspecTaskViewer', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });

    watcher = new OpenSpecWatcher(() => treeProvider.refresh());

    const refreshCommand = vscode.commands.registerCommand(
        'openspecTaskViewer.refresh',
        () => treeProvider.refresh()
    );

    // Custom command: open markdown source at line + preview side by side
    const previewAtLineCommand = vscode.commands.registerCommand(
        'openspecTaskViewer.previewMarkdownAtLine',
        async (uri: vscode.Uri, lineNumber: number) => {
            const targetPath = uri.fsPath;
            const pos = new vscode.Position(lineNumber - 1, 0);
            const sel = new vscode.Range(pos, pos);

            // Check if the file is already open in a visible editor
            const existingEditor = vscode.window.visibleTextEditors.find(
                (e) => e.document.uri.fsPath === targetPath
            );

            if (existingEditor) {
                // File already open: just reveal the line in the existing editor
                existingEditor.selection = new vscode.Selection(pos, pos);
                existingEditor.revealRange(sel, vscode.TextEditorRevealType.InCenter);
            } else {
                // File not open: open source + preview side by side
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc, {
                    selection: sel,
                    preserveFocus: false,
                });
                await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
            }
        }
    );

    context.subscriptions.push(treeView, watcher, refreshCommand, previewAtLineCommand);
}

export function deactivate(): void {
    watcher?.dispose();
    watcher = undefined;
}
