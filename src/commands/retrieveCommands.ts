import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { CommandContext, register } from './commandContext';
import { projectRoot } from '../workspace/project';
import { formatRetrieveResult } from '../salesforce/retrieveResultFormatter';
export function registerRetrieveCommands(context: CommandContext): void {
    const output = vscode.window.createOutputChannel('Better Org Browser Retrieve');
    context.extension.subscriptions.push(output);
    for (const selected of [true, false]) {
        register(context, selected ? 'retrieveSelectedMetadata' : 'retrieveManifest', async () => {
            const org = context.provider.selectedOrgTarget;
            if (!org) { throw new Error('Select a Salesforce org first.'); }
            if (selected && !context.manifest.getCount()) { throw new Error('Add metadata to manifest selections first.'); }
            const root = await projectRoot();
            const xml = context.manifest.build();
            let temp: string | undefined;
            try {
                let manifest = path.join(root.fsPath, 'manifest', 'package.xml');
                if (selected) {
                    temp = await fs.mkdtemp(path.join(os.tmpdir(), 'better-org-manifest-'));
                    manifest = path.join(temp, 'package.xml'); await fs.writeFile(manifest, xml, 'utf8');
                } else { await vscode.workspace.fs.stat(vscode.Uri.file(manifest)); }
                await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Retrieving Salesforce metadata', cancellable: false }, async () => {
                    const result = await context.provider.service.cli.retrieveManifest(org, manifest, root.fsPath);
                    output.appendLine(result);
                    await context.previews.show('retrieve-result.md', formatRetrieveResult(result));
                    const parsed = JSON.parse(result) as { status?: number; result?: { success?: boolean; done?: boolean; status?: string } };
                    if (parsed.status !== 0 || parsed.result?.success === false || parsed.result?.done === false) {
                        throw new Error(`Retrieve did not complete successfully (${parsed.result?.status ?? 'unknown status'}). See retrieve result.`);
                    }
                    void vscode.window.showInformationMessage('Retrieve complete.');
                });
            } catch (error) { output.appendLine(String(error)); output.show(true); throw error; }
            finally { if (temp) { await fs.rm(temp, { recursive: true, force: true }); } }
        });
    }
}
