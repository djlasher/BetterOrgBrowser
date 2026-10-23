import * as vscode from 'vscode';
import * as path from 'path';
import { readTextFile } from './textFile';
export async function metadataTarget(root: vscode.Uri, relative: string, create: boolean): Promise<vscode.Uri> {
    if (relative.split(/[\\/]/).some(part => part === '..' || part === '.') || path.isAbsolute(relative)) { throw new Error('Invalid metadata source path.'); }
    const config = JSON.parse(await readTextFile(vscode.Uri.joinPath(root, 'sfdx-project.json'))) as { packageDirectories?: { path: string; default?: boolean }[] };
    const packages = config.packageDirectories ?? [];
    const matches: vscode.Uri[] = [];
    for (const directory of packages) {
        const resolved = path.resolve(root.fsPath, directory.path);
        const within = path.relative(root.fsPath, resolved);
        if (within.startsWith('..') || path.isAbsolute(within)) { throw new Error('Package directory must be inside the selected project.'); }
        matches.push(...await vscode.workspace.findFiles(new vscode.RelativePattern(resolved, `**/${relative}`), '**/node_modules/**'));
    }
    if (matches.length === 1) { return matches[0]; }
    if (matches.length > 1) {
        const pick = await vscode.window.showQuickPick(matches.map(uri => ({ label: vscode.workspace.asRelativePath(uri), uri })), { placeHolder: 'Select local metadata file to update' });
        if (!pick) { throw new Error('Metadata selection cancelled.'); }
        return pick.uri;
    }
    if (!create) { throw new Error('Retrieve the containing metadata component once before syncing one of its entries.'); }
    let directory = packages.find(entry => entry.default) ?? (packages.length === 1 ? packages[0] : undefined);
    if (!directory && packages.length) { directory = (await vscode.window.showQuickPick(packages.map(entry => ({ label: entry.path, entry })), { placeHolder: 'Select destination package' }))?.entry; }
    if (!directory) { throw new Error('No destination package selected.'); }
    return vscode.Uri.joinPath(root, directory.path, 'main', 'default', relative);
}
