import * as vscode from 'vscode';
import { SObjectField } from '../salesforce/orgService';

export class MetadataNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly metadataType?: string,
        public readonly apiName?: string,
        public readonly parentApiName?: string,
        public readonly fieldDetails?: SObjectField
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.label}`;
        this.description = metadataType;
        this.contextValue = metadataType;
    }
}
