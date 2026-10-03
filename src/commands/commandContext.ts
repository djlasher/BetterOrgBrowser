import * as vscode from 'vscode';
import { MetadataProvider } from '../metadata/metadataProvider';
import { MetadataNode } from '../metadata/metadataNode';
import { PackageXmlBuilder } from '../packageXml/packageXmlBuilder';
import { PreviewProvider } from '../workspace/previewProvider';
export interface CommandContext {
    extension: vscode.ExtensionContext;
    provider: MetadataProvider;
    tree: vscode.TreeView<MetadataNode>;
    manifest: PackageXmlBuilder;
    previews: PreviewProvider;
    saveSelections(): Promise<void>;
}
export function register(context: CommandContext, name: string, action: (node?: MetadataNode) => unknown): void {
    context.extension.subscriptions.push(vscode.commands.registerCommand(`betterOrgBrowser.${name}`, async (node?: MetadataNode) => {
        try { await action(node); }
        catch (error) { void vscode.window.showErrorMessage(`Better Org Browser: ${error instanceof Error ? error.message : String(error)}`); }
    }));
}
