import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { PackageXmlBuilder, PackageXmlMember } from '../packageXml/packageXmlBuilder';
import { OrgService } from './orgService';
import { metadataTarget } from '../workspace/metadataTarget';
import { readTextFile, writeTextFile } from '../workspace/textFile';
import { objectShell } from './metadataFragment';

const children: Record<string, [string, string]> = {
    CustomField: ['fields', 'field'], RecordType: ['recordTypes', 'recordType'], ValidationRule: ['validationRules', 'validationRule'],
    FieldSet: ['fieldSets', 'fieldSet'], ListView: ['listViews', 'listView'], CompactLayout: ['compactLayouts', 'compactLayout'],
    WebLink: ['webLinks', 'webLink'], BusinessProcess: ['businessProcesses', 'businessProcess'], SharingReason: ['sharingReasons', 'sharingReason']
};
const folders: Record<string, [string, string, string]> = {
    Report: ['reports', 'report', 'reportFolder'], Dashboard: ['dashboards', 'dashboard', 'dashboardFolder'],
    EmailTemplate: ['email', 'email', 'emailFolder']
};
export function isScopedMember(member: PackageXmlMember): boolean {
    return !!(children[member.type] || folders[member.type] || ['ReportFolder', 'DashboardFolder', 'EmailFolder'].includes(member.type));
}
export function scopedPaths(member: PackageXmlMember): { requested: string[]; parents: string[] } {
    const { type, member: name } = member;
    if (!name || name.includes('*') || name.split(/[\\/]/).some(part => part === '..' || part === '.') || /[\\\x00-\x1f]/.test(name)) {
        throw new Error('Scoped retrieval requires one explicit metadata member.');
    }
    if (children[type]) {
        const dot = name.indexOf('.');
        if (dot < 1) { throw new Error('Object child must include its object API name.'); }
        const object = name.slice(0, dot), child = name.slice(dot + 1), [directory, suffix] = children[type];
        return { requested: [`objects/${object}/${directory}/${child}.${suffix}-meta.xml`], parents: [`objects/${object}/${object}.object-meta.xml`] };
    }
    const folderType = Object.entries(folders).find(([, entry]) => entry[2].toLowerCase() === type.toLowerCase());
    if (folderType) {
        const [directory, , suffix] = folderType[1];
        return { requested: [`${directory}/${name}.${suffix}-meta.xml`], parents: [] };
    }
    const entry = folders[type];
    if (!entry) { throw new Error(`Unsupported scoped metadata type: ${type}`); }
    const [directory, suffix, folderSuffix] = entry;
    const requested = type === 'EmailTemplate' ? [`${directory}/${name}.email`, `${directory}/${name}.email-meta.xml`] : [`${directory}/${name}.${suffix}-meta.xml`];
    const parts = name.split('/'); parts.pop();
    const parents = parts.map((_, i) => `${directory}/${parts.slice(0, i + 1).join('/')}.${folderSuffix}-meta.xml`);
    return { requested, parents };
}

/** The CLI only sees an isolated project. Its response can never directly write sibling source. */
export async function retrieveScoped(cli: OrgService, org: string, root: vscode.Uri, member: PackageXmlMember): Promise<string[]> {
    const allowed = scopedPaths(member);
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'better-org-scoped-'));
    try {
        const config = JSON.parse(await readTextFile(vscode.Uri.joinPath(root, 'sfdx-project.json'))) as { sourceApiVersion?: string };
        await fs.mkdir(path.join(temp, 'force-app'), { recursive: true });
        await fs.writeFile(path.join(temp, 'sfdx-project.json'), JSON.stringify({ packageDirectories: [{ path: 'force-app', default: true }], sourceApiVersion: config.sourceApiVersion ?? '66.0' }));
        const builder = new PackageXmlBuilder(); builder.add(member.type, member.member);
        const manifest = path.join(temp, 'package.xml');
        await fs.writeFile(manifest, builder.build(config.sourceApiVersion));
        const result = JSON.parse(await cli.retrieveManifest(org, manifest, temp)) as { status?: number; result?: { success?: boolean; done?: boolean } };
        if (result.status !== 0 || result.result?.success === false || result.result?.done === false) { throw new Error('Scoped retrieval failed; no source files were copied.'); }
        const source = path.join(temp, 'force-app', 'main', 'default');
        const pending: { relative: string; content: string; parent: boolean }[] = [];
        // Read only the allowlisted paths, not every file returned by Salesforce.
        for (const relative of [...allowed.requested, ...allowed.parents]) {
            const file = path.resolve(source, relative);
            if (!file.startsWith(source + path.sep)) { throw new Error('Invalid retrieved source path.'); }
            let content: string;
            try { content = await fs.readFile(file, 'utf8'); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { continue; } throw error; }
            const parent = allowed.parents.includes(relative);
            if (parent && relative.endsWith('.object-meta.xml')) { content = objectShell(content); }
            pending.push({ relative, content, parent });
        }
        if (allowed.requested.some(relative => !pending.some(file => file.relative === relative))) {
            throw new Error(`Salesforce did not return all files for ${member.type}:${member.member}; no source files were copied.`);
        }
        const written: string[] = [];
        for (const file of pending) {
            const destination = await metadataTarget(root, file.relative, true);
            if (file.parent) {
                try { await vscode.workspace.fs.stat(destination); continue; }
                catch (error) { if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') { throw error; } }
            }
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(destination.fsPath)));
            await writeTextFile(destination, file.content);
            written.push(destination.fsPath);
        }
        return written;
    } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
