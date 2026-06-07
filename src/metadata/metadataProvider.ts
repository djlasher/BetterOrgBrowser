import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';
import { MetadataListItem, OrgService, SObjectField } from '../salesforce/orgService';

export class MetadataProvider implements vscode.TreeDataProvider<MetadataNode> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<MetadataNode | undefined | void> =
        new vscode.EventEmitter<MetadataNode | undefined | void>();

    private readonly orgService = new OrgService();

    private selectedOrgName: string | undefined;
    private selectedOrgTarget: string | undefined;

    readonly onDidChangeTreeData: vscode.Event<MetadataNode | undefined | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSelectedOrg(orgName: string | undefined, orgTarget: string | undefined): void {
        this.selectedOrgName = orgName;
        this.selectedOrgTarget = orgTarget;
        this.refresh();
    }

    getTreeItem(element: MetadataNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MetadataNode): Promise<MetadataNode[]> {
        if (!element) {
            const rootNodes: MetadataNode[] = [];

            if (this.selectedOrgName) {
                rootNodes.push(
                    new MetadataNode(
                        `Connected Org: ${this.selectedOrgName}`,
                        vscode.TreeItemCollapsibleState.None,
                        'SalesforceOrg'
                    )
                );
            }

            rootNodes.push(
                new MetadataNode(
                    'Custom Objects',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'CustomObjectRoot'
                ),
                new MetadataNode(
                    'Apex Classes',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'ApexClassRoot'
                ),
                new MetadataNode(
                    'Flows',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'FlowRoot'
                ),
                new MetadataNode(
                    'Permission Sets',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'PermissionSetRoot'
                )
            );

            return rootNodes;
        }

        switch (element.metadataType) {
            case 'CustomObjectRoot':
                return this.getCustomObjects();

            case 'CustomObject':
                return [
                    new MetadataNode(
                        'Fields',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'FieldFolder',
                        undefined,
                        element.apiName
                    )
                ];

            case 'FieldFolder':
                return this.getObjectFields(element.parentApiName);

            case 'ApexClassRoot':
                return this.getApexClasses();

            case 'FlowRoot':
                return this.getFlows();

            case 'PermissionSetRoot':
                return this.getPermissionSets();

            case 'PermissionSet':
                return this.getPermissionSetFolders(element.apiName);

            default:
                return [];
        }
    }

    private async getCustomObjects(): Promise<MetadataNode[]> {
        if (!this.selectedOrgTarget) {
            return this.getSelectOrgMessage();
        }

        try {
            const customObjects = await this.orgService.listCustomObjects(this.selectedOrgTarget);

            return customObjects.map((customObject: MetadataListItem) =>
                new MetadataNode(
                    customObject.fullName,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'CustomObject',
                    customObject.fullName,
                    undefined,
                    undefined,
                    'CustomObject'
                )
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Custom Object');
        }
    }

    private async getObjectFields(objectApiName?: string): Promise<MetadataNode[]> {
        if (!this.selectedOrgTarget || !objectApiName) {
            return this.getSelectOrgMessage();
        }

        try {
            const fields = await this.orgService.describeSObject(
                this.selectedOrgTarget,
                objectApiName
            );

            return fields.map((field: SObjectField) =>
                new MetadataNode(
                    field.name,
                    vscode.TreeItemCollapsibleState.None,
                    field.type ?? 'Field',
                    field.name,
                    objectApiName,
                    field,
                    'CustomField'
                )
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Field');
        }
    }

    private async getApexClasses(): Promise<MetadataNode[]> {
        if (!this.selectedOrgTarget) {
            return this.getSelectOrgMessage();
        }

        try {
            const apexClasses = await this.orgService.listApexClasses(this.selectedOrgTarget);

            return apexClasses.map((apexClass: MetadataListItem) =>
                new MetadataNode(
                    apexClass.fullName,
                    vscode.TreeItemCollapsibleState.None,
                    apexClass.type ?? 'ApexClass',
                    apexClass.fullName,
                    undefined,
                    undefined,
                    'ApexClass'
                )
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Apex metadata');
        }
    }

    private async getFlows(): Promise<MetadataNode[]> {
        if (!this.selectedOrgTarget) {
            return this.getSelectOrgMessage();
        }

        try {
            const flows = await this.orgService.listFlows(this.selectedOrgTarget);

            return flows.map((flow: MetadataListItem) =>
                new MetadataNode(
                    flow.fullName,
                    vscode.TreeItemCollapsibleState.None,
                    flow.type ?? 'Flow',
                    flow.fullName,
                    undefined,
                    undefined,
                    'Flow'
                )
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Flow metadata');
        }
    }

    private async getPermissionSets(): Promise<MetadataNode[]> {
        if (!this.selectedOrgTarget) {
            return this.getSelectOrgMessage();
        }

        try {
            const permissionSets = await this.orgService.listPermissionSets(this.selectedOrgTarget);

            return permissionSets.map((permissionSet: MetadataListItem) =>
                new MetadataNode(
                    permissionSet.fullName,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    permissionSet.type ?? 'PermissionSet',
                    permissionSet.fullName,
                    undefined,
                    undefined,
                    'PermissionSet'
                )
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Permission Set metadata');
        }
    }

    private getPermissionSetFolders(permissionSetApiName?: string): MetadataNode[] {
        const folders = [
            'Object Permissions',
            'Field Permissions',
            'Apex Class Access',
            'Flow Access',
            'Custom Permissions',
            'Tab Settings',
            'User Permissions'
        ];

        return folders.map((folder) =>
            new MetadataNode(
                folder,
                vscode.TreeItemCollapsibleState.Collapsed,
                'PermissionSetFolder',
                undefined,
                permissionSetApiName
            )
        );
    }

    private getSelectOrgMessage(): MetadataNode[] {
        return [
            new MetadataNode(
                'Select a Salesforce org first',
                vscode.TreeItemCollapsibleState.None,
                'Info'
            )
        ];
    }

    private getErrorMessage(error: unknown, label: string): MetadataNode[] {
        const message = error instanceof Error
            ? error.message
            : `Unknown ${label} error`;

        return [
            new MetadataNode(
                `Error: ${message}`,
                vscode.TreeItemCollapsibleState.None,
                'Error'
            )
        ];
    }
}
