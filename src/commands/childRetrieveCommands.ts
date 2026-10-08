import * as vscode from 'vscode';
import * as path from 'path';
import { CommandContext, register } from './commandContext';
import { MetadataNode } from '../metadata/metadataNode';
import { metadataRegistry } from '../metadata/metadataRegistry';
import { projectRoot } from '../workspace/project';
import { readTextFile, writeTextFile } from '../workspace/textFile';
import { extractFragment, fieldDocument, mergeFragment } from '../salesforce/metadataFragment';

async function target(root: vscode.Uri, relative: string, create: boolean): Promise<vscode.Uri> {
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
export function registerChildRetrieveCommands(context: CommandContext): void {
    let queue = Promise.resolve();
    const download = async (node?: MetadataNode): Promise<void> => {
        const org = context.provider.selectedOrgTarget;
        if (!node || !org || node.org !== org || !node.canRetrieveChild) { throw new Error('Select retrievable child metadata from the current org. For Flow, Page Layout, or Lightning Page details, retrieve the containing component.'); }
        const root = await projectRoot();
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Retrieving ${node.label}` }, async () => {
            if (node.data.objectField) {
                const { object, field } = node.data.objectField;
                if (!/^[\w]+$/.test(object) || !/^[\w]+$/.test(field)) { throw new Error('Invalid field API name.'); }
                const definition = metadataRegistry.find(entry => entry.type === 'CustomObject')!;
                // Parent metadata stays in the temporary cache. Only this field reaches source.
                let block: string;
                try {
                    const xml = await context.provider.service.xml(org, definition, object);
                    block = extractFragment(xml, 'CustomObject', [{ tag: 'fields', key: 'fullName', name: field }]);
                }
                catch {
                    const files = await context.provider.service.remoteFiles(org, 'CustomField', `${object}.${field}`);
                    const returned = files.find(file => file.path.endsWith(`/${object}.object`));
                    if (!returned) { throw new Error(`Salesforce did not return retrievable metadata for ${object}.${field}. No local files were changed.`); }
                    block = extractFragment(returned.content, 'CustomObject', [{ tag: 'fields', key: 'fullName', name: field }]);
                }
                const content = fieldDocument(block);
                const file = await target(root, `objects/${object}/fields/${field}.field-meta.xml`, true);
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(file.fsPath)));
                await writeTextFile(file, content);
            } else if (node.data.sourceFile) {
                if (node.remoteContent === undefined) { throw new Error('No source content returned for this file.'); }
                const file = await target(root, node.data.sourceFile, true);
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(file.fsPath)));
                await writeTextFile(file, node.remoteContent);
            } else {
                let owner = node.parent;
                while (owner && !owner.definition?.suffix) { owner = owner.parent; }
                if (!owner?.name || !owner.definition?.suffix) { throw new Error('No containing metadata component.'); }
                const definition = owner.definition;
                const xml = await context.provider.service.xml(org, definition, owner.name);
                const block = extractFragment(xml, definition.type, node.data.fragment!);
                const file = await target(root, `${owner.name}${definition.suffix}-meta.xml`, false);
                const local = await readTextFile(file);
                const merged = mergeFragment(local, block, definition.type, node.data.fragment!);
                if (merged !== local) { await writeTextFile(file, merged); }
            }
        });
        void vscode.window.showInformationMessage(`Retrieved ${node.label}.`);
    };
    register(context, 'retrieveChildMetadata', node => {
        const pending = queue.then(() => download(node));
        queue = pending.catch(() => undefined); return pending;
    });
}
