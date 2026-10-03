import * as vscode from 'vscode';
import { CommandContext, register } from './commandContext';
import { MetadataNode } from '../metadata/metadataNode';
import { metadataRegistry } from '../metadata/metadataRegistry';
import { findXmlBlockByChildValue, mergeXmlBlockByChildValue } from '../salesforce/permissionSetMerge';
import { permissionSetFile, projectRoot } from '../workspace/project';
import { readTextFile, writeTextFile } from '../workspace/textFile';
export function registerPermissionSetCommands(context: CommandContext): void {
    // Serialize edits so two clicks cannot overwrite one another's additions.
    let queue = Promise.resolve();
    const sync = async (node?: MetadataNode): Promise<void> => {
        const entry = node?.data.sync;
        let parent = node?.parent;
        while (parent && parent.kind !== 'PermissionSet') { parent = parent.parent; }
        const name = parent?.name, org = context.provider.selectedOrgTarget;
        if (!entry || !name || !org || node?.org !== org) { throw new Error('Select a Permission Set entry from the current org.'); }
        const root = await projectRoot();
        const file = await permissionSetFile(root, name);
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Syncing ${entry.name}` }, async () => {
            const xml = await context.provider.service.xml(org, metadataRegistry.find(def => def.type === 'PermissionSet')!, name);
            const remote = findXmlBlockByChildValue(xml, entry.section, entry.key, entry.name);
            if (!remote) { throw new Error(`Remote entry ${entry.name} was not returned.`); }
            // Read after remote work, retaining edits made while the network request ran.
            const local = await readTextFile(file);
            const merged = mergeXmlBlockByChildValue(local, remote, entry.section, entry.key, entry.name);
            if (merged !== local) { await writeTextFile(file, merged); }
        });
        void vscode.window.showInformationMessage(`Synced ${entry.name} into ${name}.`);
    };
    for (const command of ['syncPermissionSetEntry', 'syncFieldPermissionEntry', 'syncObjectPermissionEntry']) {
        register(context, command, node => {
            const pending = queue.then(() => sync(node));
            queue = pending.catch(() => undefined); return pending;
        });
    }
}
