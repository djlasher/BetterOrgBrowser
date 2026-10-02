import * as vscode from 'vscode';
import * as path from 'path';
import { readTextFile } from './textFile';
export async function projectRoot(): Promise<vscode.Uri> {
    const roots: vscode.Uri[] = [];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        try { await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, 'sfdx-project.json')); roots.push(folder.uri); } catch { /* Not an SFDX project. */ }
    }
    if (!roots.length) { throw new Error('Open a Salesforce DX project containing sfdx-project.json.'); }
    if (roots.length === 1) { return roots[0]; }
    const pick = await vscode.window.showQuickPick(roots.map(uri => ({ label: uri.fsPath, uri })), { placeHolder: 'Select Salesforce DX project' });
    if (!pick) { throw new Error('Project selection cancelled.'); }
    return pick.uri;
}
export async function permissionSetFile(root: vscode.Uri, name: string): Promise<vscode.Uri> {
    if (!/^[\w]+$/.test(name)) { throw new Error('Invalid Permission Set API name.'); }
    const config = JSON.parse(await readTextFile(vscode.Uri.joinPath(root, 'sfdx-project.json'))) as { packageDirectories?: { path: string; default?: boolean }[] };
    const matches: vscode.Uri[] = [];
    for (const directory of config.packageDirectories ?? []) {
        const resolved = path.resolve(root.fsPath, directory.path);
        const relative = path.relative(root.fsPath, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) { throw new Error('Package directory must be inside the selected project.'); }
        matches.push(...await vscode.workspace.findFiles(new vscode.RelativePattern(resolved, `**/permissionsets/${name}.permissionset-meta.xml`), '**/node_modules/**'));
    }
    if (!matches.length) { throw new Error(`No local ${name}.permissionset-meta.xml in the project package directories. Retrieve or create a trimmed local Permission Set first.`); }
    if (matches.length === 1) { return matches[0]; }
    const pick = await vscode.window.showQuickPick(matches.map(uri => ({ label: vscode.workspace.asRelativePath(uri), uri })), { placeHolder: 'Select local Permission Set to update' });
    if (!pick) { throw new Error('Permission Set selection cancelled.'); }
    return pick.uri;
}
