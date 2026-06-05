import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MetadataProvider();

    vscode.window.registerTreeDataProvider(
        'betterOrgBrowserView',
        provider
    );

    const refreshCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.refresh',
        () => {
            provider.refresh();
        }
    );

    context.subscriptions.push(refreshCommand);

    console.log('Better Org Browser activated.');
}

export function deactivate(): void {
    // Cleanup logic can go here later.
}
