import * as vscode from 'vscode';
import { SemanticNode, metadataPath, PathNode } from './metadataModel';
import { MetadataDefinition } from './metadataRegistry';
import { SObjectField } from '../salesforce/orgService';
export class MetadataNode extends vscode.TreeItem implements PathNode {
    readonly kind: string;
    readonly name?: string;
    children?: MetadataNode[];
    loader?: () => Promise<MetadataNode[]>;
    definition?: MetadataDefinition;
    fieldDetails?: SObjectField;
    remoteContent?: string;
    org?: string;
    constructor(public readonly data: SemanticNode, public readonly parent?: MetadataNode) {
        super(data.label, data.children?.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.label = data.label;
        this.kind = data.kind;
        this.name = data.name;
        this.org = parent?.org;
        this.id = `${parent?.id ?? 'metadata'}/${data.kind}:${encodeURIComponent(data.name ?? data.label)}`;
        this.description = data.description || (data.name && data.name !== data.label ? data.name : undefined);
        this.contextValue = `node${data.manifest ? ':manifest' : ''}${data.sync ? ':sync' : ''}${this.canRetrieveChild ? ':download' : ''}`;
        this.tooltip = `${metadataPath(this)}${data.manifest ? `\nManifest: ${data.manifest.type}:${data.manifest.member}` : this.canRetrieveChild ? '\nRetrieve this child metadata only.' : data.sync ? '\nSync this permission entry only.' : '\nBrowse / inspect only; retrieve the containing metadata component.'}`;
        this.iconPath = new vscode.ThemeIcon(data.kind === 'section' || data.kind === 'root' ? 'folder' : data.kind === 'Value' ? (data.description === 'Yes' ? 'check' : data.description === 'No' ? 'close' : 'symbol-property') : data.sync ? 'shield' : 'symbol-property');
        this.children = data.children?.map(child => new MetadataNode(child, this));
    }
    declare label: string;
    get canRetrieveChild(): boolean {
        // These children describe a connected process or visual composition.
        // Keep them inspectable, but retrieve the complete containing component.
        for (let owner = this.parent; owner; owner = owner.parent) {
            if (['Flow', 'Layout', 'FlexiPage'].includes(owner.kind)) { return false; }
        }
        return !!(this.data.fragment || this.data.objectField || this.data.sourceFile);
    }
    expandable(load: () => Promise<MetadataNode[]>): this {
        this.loader = load;
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        return this;
    }
}
