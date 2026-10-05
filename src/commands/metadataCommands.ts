import * as vscode from 'vscode';
import { CommandContext, register } from './commandContext';
import { metadataPath } from '../metadata/metadataModel';
import { MetadataNode } from '../metadata/metadataNode';
export function registerMetadataCommands(context: CommandContext): void {
    register(context, 'copyApiName', async node => {
        if (!node?.name) { throw new Error('Select a named metadata item.'); }
        await vscode.env.clipboard.writeText(node.name);
    });
    register(context, 'copyFullMetadataPath', async node => {
        if (!node) { throw new Error('Select a metadata item.'); }
        await vscode.env.clipboard.writeText(metadataPath(node));
    });
    for (const command of ['showFieldDetails', 'showMetadataDetails']) {
        register(context, command, async node => {
            if (!node) { throw new Error('Select a metadata item.'); }
            await context.previews.show(node.remoteContent !== undefined ? `remote-${node.label.replace(/[\\/]/g, '-')}` : 'metadata-details.json',
                node.remoteContent ?? JSON.stringify({ path: metadataPath(node), ...(node.data.details ?? node.fieldDetails ?? {}), manifest: node.data.manifest }, null, 2));
        });
    }
    register(context, 'searchMetadata', async () => {
        let level = await context.provider.getChildren();
        // Search one selected type/folder at a time; no full-org XML crawl.
        while (level.length) {
            const pick = await vscode.window.showQuickPick(level.map(node => ({ label: node.label, description: node.name ?? node.definition?.type, node })),
                { placeHolder: 'Filter by metadata type, label or API name; select to reveal / drill deeper', matchOnDescription: true });
            if (!pick) { return; }
            const node: MetadataNode = pick.node;
            await context.tree.reveal(node, { select: true, focus: true, expand: false });
            if (node.collapsibleState === vscode.TreeItemCollapsibleState.None) { return; }
            level = await context.provider.getChildren(node);
        }
    });
}
