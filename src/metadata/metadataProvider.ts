import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';
import { metadataRegistry, MetadataDefinition } from './metadataRegistry';
import { MetadataService } from '../salesforce/metadataService';
import { SessionCache } from '../cache/sessionCache';
export class MetadataProvider implements vscode.TreeDataProvider<MetadataNode>, vscode.Disposable {
    private readonly changed = new vscode.EventEmitter<MetadataNode | undefined | void>();
    readonly onDidChangeTreeData = this.changed.event;
    private readonly children = new SessionCache<MetadataNode[]>();
    private roots: MetadataNode[] = [];
    private generation = 0;
    selectedOrgTarget?: string;
    selectedOrgName?: string;
    constructor(readonly service: MetadataService) {}
    dispose(): void { this.changed.dispose(); }
    refresh(): void { this.generation++; this.service.clear(); this.children.clear(); this.roots = []; this.changed.fire(); }
    setSelectedOrg(label?: string, target?: string): void { this.selectedOrgName = label; this.selectedOrgTarget = target; this.refresh(); }
    getTreeItem(node: MetadataNode): vscode.TreeItem { return node; }
    getParent(node: MetadataNode): MetadataNode | undefined { return node.parent; }
    async getChildren(node?: MetadataNode): Promise<MetadataNode[]> {
        if (!node) {
            if (!this.selectedOrgTarget) { return [new MetadataNode({ label: 'Select a Salesforce org to browse', kind: 'Info' })]; }
            if (!this.roots.length) {
                const org = this.selectedOrgTarget;
                this.roots = metadataRegistry.map(def => {
                    const root = new MetadataNode({ label: def.label, kind: 'root' });
                    root.definition = def; root.org = org; root.iconPath = new vscode.ThemeIcon(def.icon);
                    return root.expandable(() => this.list(root, def, org));
                });
            }
            return this.roots;
        }
        if (node.org && node.org !== this.selectedOrgTarget) { return []; }
        if (node.children) { return node.children; }
        if (!node.loader) { return []; }
        const generation = this.generation;
        try {
            const result = await this.children.get(node.id!, async () => vscode.window.withProgress(
                { location: { viewId: 'betterOrgBrowserView' }, title: `Loading ${node.label}` }, node.loader!));
            return generation === this.generation ? (result.length ? result : [new MetadataNode({ label: 'No available entries', kind: 'Info' }, node)]) : [];
        } catch (error) {
            return [new MetadataNode({ label: `Unable to load: ${error instanceof Error ? error.message : String(error)}`, kind: 'Error' }, node)];
        }
    }
    private async list(parent: MetadataNode, def: MetadataDefinition, org: string, folder?: string): Promise<MetadataNode[]> {
        if (def.singleton) {
            return def.parse!(await this.service.xml(org, def, def.singleton), def.singleton).map(data => new MetadataNode(data, parent));
        }
        if (def.folderType && !folder) {
            const folders = await this.service.list(org, def.folderType);
            return folders.map(item => {
                const node = new MetadataNode({ label: item.fullName, name: item.fullName, kind: 'Folder' }, parent);
                return node.expandable(() => this.list(node, def, org, item.fullName));
            });
        }
        const items = await this.service.list(org, def.type, folder);
        return items.map(item => {
            const node = new MetadataNode({ label: item.fullName, name: item.fullName, kind: def.type,
                description: item.namespacePrefix || item.manageableState || undefined,
                manifest: { type: def.type, member: item.fullName } }, parent);
            node.definition = def; node.iconPath = new vscode.ThemeIcon(def.icon);
            if (def.type === 'CustomObject') {
                node.expandable(async () => {
                    const metadataFields = new Set<string>();
                    const fields = new MetadataNode({ label: 'Fields', kind: 'section' }, node);
                    fields.expandable(async () => (await this.service.describe(org, item.fullName)).map(field => {
                        const child = new MetadataNode({ label: field.name, name: field.name, kind: 'CustomField', description: field.type,
                            manifest: field.custom || field.name.endsWith('__c') || metadataFields.has(field.name)
                                ? { type: 'CustomField', member: `${item.fullName}.${field.name}` } : undefined,
                            details: { ...field } }, fields);
                        child.fieldDetails = field; child.contextValue += ':field'; return child;
                    }));
                    // The describe-backed Fields folder remains available if metadata retrieval fails.
                    try {
                        const parsed = def.parse!(await this.service.xml(org, def, item.fullName), item.fullName);
                        for (const field of parsed.find(section => section.label === 'Fields')?.children ?? []) {
                            if (field.name) { metadataFields.add(field.name); }
                        }
                        const sections = parsed.filter(section => section.label !== 'Fields');
                        return [fields, ...sections.map(data => new MetadataNode(data, node))];
                    } catch (error) {
                        return [fields, new MetadataNode({ label: `Object metadata unavailable: ${String(error)}`, kind: 'Error' }, node)];
                    }
                });
            } else if (def.parse) {
                node.expandable(async () => def.parse!(await this.service.xml(org, def, item.fullName), item.fullName).map(data => new MetadataNode(data, node)));
            } else if (def.bundle) {
                node.expandable(async () => (await this.service.remoteFiles(org, def.type, item.fullName))
                    .filter(file => file.path.includes(`/${def.bundle}/${item.fullName}/`) || file.path.startsWith(`${def.bundle}/${item.fullName}/`))
                    .map(file => {
                        const child = new MetadataNode({ label: file.path.split(`/${item.fullName}/`).pop()!, kind: 'BundleFile', name: file.path.split(`/${item.fullName}/`).pop() }, node);
                        child.remoteContent = file.content; return child;
                    }));
            }
            return node;
        });
    }
}
