import * as vscode from 'vscode';
import { MetadataProvider } from '../metadata/metadataProvider';
import { MetadataNode } from '../metadata/metadataNode';
import { PackageXmlBuilder } from '../packageXml/packageXmlBuilder';
import { PreviewProvider } from '../workspace/previewProvider';
import { RetrievalFeedback } from './retrievalFeedback';
export interface CommandContext {
    extension: vscode.ExtensionContext;
    provider: MetadataProvider;
    tree: vscode.TreeView<MetadataNode>;
    manifest: PackageXmlBuilder;
    previews: PreviewProvider;
    saveSelections(): Promise<void>;
    retrievalFeedback?: RetrievalFeedback;
}
const retrievalCommands = new Set(['retrieveMetadata', 'retrieveChildMetadata', 'retrieveSelectedMetadata', 'retrieveManifest',
    'syncPermissionSetEntry', 'syncFieldPermissionEntry', 'syncObjectPermissionEntry']);
export function register(context: CommandContext, name: string, action: (node?: MetadataNode) => unknown): void {
    context.extension.subscriptions.push(vscode.commands.registerCommand(`betterOrgBrowser.${name}`, async (node?: MetadataNode) => {
        try {
            if (retrievalCommands.has(name)) {
                if (!context.retrievalFeedback) {
                    context.retrievalFeedback = new RetrievalFeedback(context);
                    context.extension.subscriptions.push(context.retrievalFeedback);
                }
                const label = node?.label ?? (name === 'retrieveManifest' ? 'Project manifest' : 'Selected metadata');
                await context.retrievalFeedback.run(label, () => action(node));
            } else { await action(node); }
        }
        catch (error) { void vscode.window.showErrorMessage(`Better Org Browser: ${error instanceof Error ? error.message : String(error)}`); }
    }));
}
