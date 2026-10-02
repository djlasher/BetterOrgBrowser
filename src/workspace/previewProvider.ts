import * as vscode from 'vscode';
export class PreviewProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
    private readonly changed = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this.changed.event;
    private readonly content = new Map<string, string>();
    provideTextDocumentContent(uri: vscode.Uri): string { return this.content.get(uri.toString()) ?? ''; }
    update(name: string, content: string): vscode.Uri {
        const uri = vscode.Uri.from({ scheme: 'better-org-browser', path: `/${name}` });
        this.content.set(uri.toString(), content); this.changed.fire(uri); return uri;
    }
    async show(name: string, content: string): Promise<void> {
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(this.update(name, content)), { preview: true });
    }
    dispose(): void { this.changed.dispose(); this.content.clear(); }
}
