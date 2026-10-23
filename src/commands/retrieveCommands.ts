import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { CommandContext, register } from './commandContext';
import { projectRoot } from '../workspace/project';
import { formatRetrieveResult } from '../salesforce/retrieveResultFormatter';
import { PackageXmlBuilder } from '../packageXml/packageXmlBuilder';
import { isScopedMember, retrieveScoped } from '../salesforce/scopedRetrieve';
export function registerRetrieveCommands(context: CommandContext): void {
    const output = vscode.window.createOutputChannel('Better Org Browser Retrieve');
    context.extension.subscriptions.push(output);
    register(context, 'showRetrievalActivity', () => context.retrievalFeedback?.show());
    for (const mode of ['node', 'selected', 'manifest'] as const) {
        register(context, mode === 'node' ? 'retrieveMetadata' : mode === 'selected' ? 'retrieveSelectedMetadata' : 'retrieveManifest', async node => {
            const org = context.provider.selectedOrgTarget;
            if (!org) { throw new Error('Select a Salesforce org first.'); }
            let selections = context.manifest;
            if (mode === 'node') {
                if (!node?.data.manifest || node.org !== org) { throw new Error('Select a retrievable metadata component from the current org.'); }
                selections = new PackageXmlBuilder();
                selections.add(node.data.manifest.type, node.data.manifest.member);
            }
            if (mode === 'selected' && !selections.getCount()) { throw new Error('Add metadata to manifest selections first.'); }
            const root = await projectRoot();
            if (mode !== 'manifest') {
                const scoped = selections.getSelections().filter(isScopedMember);
                if (scoped.length) {
                    const written: string[] = [];
                    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Retrieving selected metadata only' }, async () => {
                        for (const member of scoped) { written.push(...await retrieveScoped(context.provider.service.cli, org, root, member)); }
                    });
                    output.appendLine(`Saved selected metadata only:\n${written.join('\n')}`);
                    await context.previews.show('retrieve-result.md', '# Retrieve Result\n\nSaved selected metadata and missing parent descriptors only:\n\n' + written.map(file => `- ${file}`).join('\n'));
                    const remaining = new PackageXmlBuilder();
                    for (const member of selections.getSelections().filter(member => !isScopedMember(member))) { remaining.add(member.type, member.member); }
                    if (!remaining.getCount()) { void vscode.window.showInformationMessage(`Retrieve complete: ${written.length} selected source file(s) saved.`); return; }
                    selections = remaining;
                }
            }
            const xml = selections.build();
            let temp: string | undefined;
            try {
                let manifest = path.join(root.fsPath, 'manifest', 'package.xml');
                if (mode !== 'manifest') {
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
