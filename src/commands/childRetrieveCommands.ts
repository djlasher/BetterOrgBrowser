import * as vscode from 'vscode';
import * as path from 'path';
import { CommandContext, register } from './commandContext';
import { MetadataNode } from '../metadata/metadataNode';
import { metadataRegistry } from '../metadata/metadataRegistry';
import { projectRoot } from '../workspace/project';
import { readTextFile, writeTextFile } from '../workspace/textFile';
import { metadataTarget as target } from '../workspace/metadataTarget';
import { extractFragment, fieldDocument, mergeFragment } from '../salesforce/metadataFragment';

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
