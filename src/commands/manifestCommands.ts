import * as vscode from 'vscode';
import { CommandContext, register } from './commandContext';
import { projectRoot } from '../workspace/project';
import { writeTextFile } from '../workspace/textFile';
export function registerManifestCommands(context: CommandContext): void {
    const { manifest, previews } = context;
    for (const action of ['addToManifest', 'removeFromManifest'] as const) {
        register(context, action, async node => {
            const member = node?.data.manifest;
            if (!member) { throw new Error('Select independently retrievable metadata. This child can only be retrieved with its parent.'); }
            if (action === 'addToManifest') { manifest.add(member.type, member.member); }
            else { manifest.remove(member.type, member.member); }
            await context.saveSelections();
        });
    }
    register(context, 'clearManifestSelections', async () => {
        if (!manifest.getCount()) { return; }
        if (await vscode.window.showWarningMessage(`Clear ${manifest.getCount()} manifest selections?`, { modal: true }, 'Clear Selections') !== 'Clear Selections') { return; }
        manifest.clear(); await context.saveSelections();
    });
    register(context, 'showManifestSelections', () => previews.show('selections.md', selectionText(context)));
    register(context, 'previewManifest', () => previews.show('package.xml', manifest.build()));
    register(context, 'writeManifest', async () => {
        const root = await projectRoot();
        const directory = vscode.Uri.joinPath(root, 'manifest');
        const file = vscode.Uri.joinPath(directory, 'package.xml');
        let exists = false;
        try { await vscode.workspace.fs.stat(file); exists = true; } catch { /* New manifest. */ }
        if (exists && await vscode.window.showWarningMessage('Replace existing manifest/package.xml with current selections?', { modal: true }, 'Replace') !== 'Replace') { return; }
        await vscode.workspace.fs.createDirectory(directory);
        await writeTextFile(file, manifest.build());
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));
    });
}
export function selectionText(context: CommandContext): string {
    return ['# Manifest Selections', '', `Total: ${context.manifest.getCount()}`, '', ...context.manifest.getSelections().map(m => `- ${m.type}: ${m.member}`)].join('\n');
}
