import * as vscode from 'vscode';
import { SObjectField } from '../salesforce/orgService';
import { FieldPermission, ObjectPermission } from '../salesforce/permissionSetParser';

export class MetadataNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly metadataType?: string,
        public readonly apiName?: string,
        public readonly parentApiName?: string,
        public readonly fieldDetails?: SObjectField,
        public readonly packageXmlType?: string,
        public readonly objectPermission?: ObjectPermission,
        public readonly fieldPermission?: FieldPermission
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.label}`;
        this.description = metadataType;
        this.contextValue = metadataType;
    }
}
