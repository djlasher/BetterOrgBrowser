import * as vscode from 'vscode';
import type { CommandContext } from './commandContext';

/** Keep feedback visible even when a cached download finishes before a toast renders. */
export class RetrievalFeedback implements vscode.Disposable {
    private readonly status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 102);
    private readonly output = vscode.window.createOutputChannel('Better Org Browser Activity');
    private readonly pending = new Map<number, string>();
    private sequence = 0;
    private latest = '';
    private failed = false;
    constructor(private readonly context: CommandContext) {
        this.status.name = 'Better Org Browser retrieval';
        this.status.command = 'betterOrgBrowser.showRetrievalActivity';
    }
    show(): void { this.output.show(true); }
    dispose(): void { this.status.dispose(); this.output.dispose(); }
    async run(label: string, action: () => unknown): Promise<void> {
        const id = ++this.sequence;
        const org = this.context.provider.selectedOrgTarget;
        const description = `${label}${org ? ` (${org})` : ''}`;
        this.pending.set(id, description);
        this.output.appendLine(`${new Date().toISOString()} START ${description}`);
        this.render();
        try {
            await action();
            this.latest = `Completed: ${description}`;
            this.failed = false;
            this.output.appendLine(`${new Date().toISOString()} ${this.latest}`);
        } catch (error) {
            this.latest = `Failed: ${description} — ${error instanceof Error ? error.message : String(error)}`;
            this.failed = true;
            this.output.appendLine(`${new Date().toISOString()} ${this.latest}`);
            throw error;
        } finally {
            this.pending.delete(id);
            this.render();
        }
    }
    private render(): void {
        const active = [...this.pending.values()];
        const message = active.length ? `Retrieving: ${active[0]}${active.length > 1 ? ` • ${active.length} operations active or queued` : ''}` : this.latest;
        this.status.text = `${active.length ? '$(sync~spin)' : this.failed ? '$(error)' : '$(check)'} ${message.length > 100 ? message.slice(0, 97) + '…' : message}`;
        this.status.tooltip = `${message}\nClick to view retrieval activity.`;
        this.status.show();
        const org = this.context.provider.selectedOrgName;
        this.context.tree.message = `${org ? `Selected org: ${org}\n` : ''}${message}`;
    }
}
