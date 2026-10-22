import * as vscode from 'vscode';
import * as path from 'path';
import type { MetadataNode } from '../metadata/metadataNode';
import { XmlSelector } from '../metadata/metadataModel';
import { extractFragment } from '../salesforce/metadataFragment';
import { projectRoot, clearProjectSelection } from './project';

const components: Record<string, [string, string]> = {
    ApexClass: ['classes', '.cls'], ApexTrigger: ['triggers', '.trigger'], Flow: ['flows', '.flow-meta.xml'],
    PermissionSet: ['permissionsets', '.permissionset-meta.xml'], Profile: ['profiles', '.profile-meta.xml'],
    PermissionSetGroup: ['permissionsetgroups', '.permissionsetgroup-meta.xml'], Layout: ['layouts', '.layout-meta.xml'],
    FlexiPage: ['flexipages', '.flexipage-meta.xml'], CustomApplication: ['applications', '.app-meta.xml'],
    CustomMetadata: ['customMetadata', '.md-meta.xml'], CustomTab: ['tabs', '.tab-meta.xml'],
    StaticResource: ['staticresources', '.resource-meta.xml'], Queue: ['queues', '.queue-meta.xml'], Group: ['groups', '.group-meta.xml'],
    NamedCredential: ['namedCredentials', '.namedCredential-meta.xml'], ExternalCredential: ['externalCredentials', '.externalCredential-meta.xml'],
    AuthProvider: ['authproviders', '.authprovider-meta.xml'], ConnectedApp: ['connectedApps', '.connectedApp-meta.xml'],
    RemoteSiteSetting: ['remoteSiteSettings', '.remoteSite-meta.xml'], CustomPermission: ['customPermissions', '.customPermission-meta.xml'],
    EmailTemplate: ['email', '.email'], Report: ['reports', '.report-meta.xml'], Dashboard: ['dashboards', '.dashboard-meta.xml'],
    EmailFolder: ['email', '.emailFolder-meta.xml'], ReportFolder: ['reports', '.reportFolder-meta.xml'], DashboardFolder: ['dashboards', '.dashboardFolder-meta.xml']
};
const objectChildren: Record<string, [string, string]> = {
    CustomField: ['fields', '.field-meta.xml'], RecordType: ['recordTypes', '.recordType-meta.xml'],
    ValidationRule: ['validationRules', '.validationRule-meta.xml'], FieldSet: ['fieldSets', '.fieldSet-meta.xml'],
    ListView: ['listViews', '.listView-meta.xml'], CompactLayout: ['compactLayouts', '.compactLayout-meta.xml'],
    WebLink: ['webLinks', '.webLink-meta.xml'], BusinessProcess: ['businessProcesses', '.businessProcess-meta.xml'],
    SharingReason: ['sharingReasons', '.sharingReason-meta.xml']
};
interface Reference { paths?: string[]; aggregate?: string; root?: string; selectors?: XmlSelector[] }
function memberReference(type: string, member: string): Reference | undefined {
    if (type === 'CustomObject') { return { paths: [`objects/${member}/${member}.object-meta.xml`] }; }
    if (type === 'LightningComponentBundle') { return { paths: [`lwc/${member}/${member}.js-meta.xml`] }; }
    if (type === 'AuraDefinitionBundle') { return { paths: ['cmp', 'app', 'evt', 'intf', 'lib', 'tokens'].map(ext => `aura/${member}/${member}.${ext}`) }; }
    if (type === 'CustomLabel') { return { aggregate: '.labels-meta.xml', root: 'CustomLabels', selectors: [{ tag: 'labels', key: 'fullName', name: member }] }; }
    if (objectChildren[type]) {
        const dot = member.indexOf('.');
        if (dot < 1) { return undefined; }
        const [directory, suffix] = objectChildren[type];
        return { paths: [`objects/${member.slice(0, dot)}/${directory}/${member.slice(dot + 1)}${suffix}`] };
    }
    const entry = components[type];
    return entry ? { paths: [`${entry[0]}/${member}${entry[1]}`] } : undefined;
}
function reference(node: MetadataNode): Reference | undefined {
    if (node.data.objectField) { return memberReference('CustomField', `${node.data.objectField.object}.${node.data.objectField.field}`); }
    if (node.data.sourceFile) { return { paths: [node.data.sourceFile] }; }
    if (node.data.manifest) { return memberReference(node.data.manifest.type, node.data.manifest.member); }
    if (node.data.sync || (node.canRetrieveChild && node.data.fragment)) {
        let owner = node.parent;
        while (owner && !owner.definition?.suffix) { owner = owner.parent; }
        if (!owner?.name || !owner.definition) { return undefined; }
        const parent = memberReference(owner.definition.type, owner.name);
        const sync = node.data.sync;
        return parent ? { ...parent, root: owner.definition.type,
            selectors: sync ? [{ tag: sync.section, key: sync.key, name: sync.name }] : node.data.fragment } : undefined;
    }
    return undefined;
}
interface Snapshot { root: vscode.Uri; files: vscode.Uri[]; xml: Map<string, Promise<string>> }
export interface LocalState { present?: boolean; file?: vscode.Uri; reason?: string }

/** Index only configured package directories, never the remote retrieval cache. */
export class LocalMetadata implements vscode.Disposable {
    private snapshot?: Promise<Snapshot | undefined>;
    private readonly subscriptions: vscode.Disposable[] = [];
    private readonly projectWatchers = new Map<string, vscode.FileSystemWatcher>();
    private timer?: ReturnType<typeof setTimeout>;
    constructor(private readonly changed: () => void) {}
    watch(): void {
        this.addWatcher(vscode.workspace.createFileSystemWatcher('**/*'));
        this.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => { clearProjectSelection(); this.invalidate(); }));
    }
    private addWatcher(watcher: vscode.FileSystemWatcher): void {
        this.subscriptions.push(watcher, watcher.onDidCreate(uri => this.fileChanged(uri)),
            watcher.onDidChange(uri => this.fileChanged(uri)), watcher.onDidDelete(uri => this.fileChanged(uri)));
    }
    private fileChanged(uri: vscode.Uri): void {
        if (/\/(node_modules|\.git|\.sf|\.sfdx)\//.test(uri.path)) { return; }
        this.snapshot = undefined;
        if (this.timer) { clearTimeout(this.timer); }
        this.timer = setTimeout(() => { this.timer = undefined; this.changed(); }, 100);
    }
    invalidate(): void { this.snapshot = undefined; this.changed(); }
    dispose(): void {
        if (this.timer) { clearTimeout(this.timer); }
        for (const subscription of this.subscriptions) { subscription.dispose(); }
    }
    private async scan(): Promise<Snapshot | undefined> {
        const root = await projectRoot(false);
        if (!root) { return undefined; }
        if (!this.projectWatchers.has(root.toString())) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, '**/*'));
            this.projectWatchers.set(root.toString(), watcher); this.addWatcher(watcher);
        }
        const config = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, 'sfdx-project.json'))).toString('utf8')) as { packageDirectories?: { path: string }[] };
        const files = new Map<string, vscode.Uri>();
        for (const directory of config.packageDirectories ?? []) {
            const resolved = path.resolve(root.fsPath, directory.path);
            const relative = path.relative(root.fsPath, resolved);
            if (relative.startsWith('..') || path.isAbsolute(relative)) { throw new Error('Package directory must be inside the selected project.'); }
            for (const file of await vscode.workspace.findFiles(new vscode.RelativePattern(resolved, '**/*'), '**/{node_modules,.git,.sf,.sfdx}/**')) {
                files.set(file.toString(), file);
            }
        }
        return { root, files: [...files.values()], xml: new Map() };
    }
    async state(node: MetadataNode): Promise<LocalState | undefined> {
        const ref = reference(node);
        if (!ref) { return undefined; }
        try {
            const snapshot = await (this.snapshot ??= this.scan());
            if (!snapshot) { return { reason: 'Select a Salesforce DX project to check local source.' }; }
            const matches = snapshot.files.filter(file => ref.paths?.some(relative => file.path.endsWith('/' + relative)) || (ref.aggregate && file.path.endsWith(ref.aggregate)));
            for (const file of matches) {
                if (!ref.selectors || !ref.root) { return { present: true, file }; }
                try {
                    let xml = snapshot.xml.get(file.toString());
                    if (!xml) {
                        xml = vscode.workspace.fs.readFile(file).then(bytes => Buffer.from(bytes).toString('utf8')) as Promise<string>;
                        snapshot.xml.set(file.toString(), xml);
                    }
                    extractFragment(await xml, ref.root, ref.selectors);
                    return { present: true, file };
                } catch { /* The containing file alone is not evidence that the child exists. */ }
            }
            return { present: false, reason: `Not saved locally in ${snapshot.root.fsPath}.` };
        } catch (error) { return { reason: `Local status unavailable: ${error instanceof Error ? error.message : String(error)}` }; }
    }
}
