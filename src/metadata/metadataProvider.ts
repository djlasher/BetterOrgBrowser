import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';
import { MetadataListItem, OrgService, SObjectField } from '../salesforce/orgService';
import { FieldPermission, ObjectPermission, parseFieldPermissions, parseObjectPermissions } from '../salesforce/permissionSetParser';

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
                rootNodes.push(new MetadataNode(`Connected Org: ${this.selectedOrgName}`, vscode.TreeItemCollapsibleState.None, 'SalesforceOrg'));
            }

            rootNodes.push(
                new MetadataNode('Custom Objects', vscode.TreeItemCollapsibleState.Collapsed, 'CustomObjectRoot'),
                new MetadataNode('Apex Classes', vscode.TreeItemCollapsibleState.Collapsed, 'ApexClassRoot'),
                new MetadataNode('Flows', vscode.TreeItemCollapsibleState.Collapsed, 'FlowRoot'),
                new MetadataNode('Permission Sets', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetRoot')
            );

            return rootNodes;
        }

        switch (element.metadataType) {
            case 'CustomObjectRoot':
                return this.getCustomObjects();
            case 'CustomObject':
                return [new MetadataNode('Fields', vscode.TreeItemCollapsibleState.Collapsed, 'FieldFolder', undefined, element.apiName)];
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
            case 'PermissionSetObjectPermissionsFolder':
                return this.getPermissionSetObjectPermissions(element.parentApiName);
            case 'PermissionSetFieldPermissionsFolder':
                return this.getPermissionSetFieldPermissions(element.parentApiName);
            case 'PermissionSetObjectPermission':
                return this.getObjectPermissionDetails(element.objectPermission);
            case 'PermissionSetFieldPermission':
                return this.getFieldPermissionDetails(element.fieldPermission);
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
                new MetadataNode(customObject.fullName, vscode.TreeItemCollapsibleState.Collapsed, 'CustomObject', customObject.fullName, undefined, undefined, 'CustomObject')
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
            const fields = await this.orgService.describeSObject(this.selectedOrgTarget, objectApiName);
            return fields.map((field: SObjectField) =>
                new MetadataNode(field.name, vscode.TreeItemCollapsibleState.None, field.type ?? 'Field', field.name, objectApiName, field, 'CustomField')
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
                new MetadataNode(apexClass.fullName, vscode.TreeItemCollapsibleState.None, apexClass.type ?? 'ApexClass', apexClass.fullName, undefined, undefined, 'ApexClass')
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
                new MetadataNode(flow.fullName, vscode.TreeItemCollapsibleState.None, flow.type ?? 'Flow', flow.fullName, undefined, undefined, 'Flow')
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
                new MetadataNode(permissionSet.fullName, vscode.TreeItemCollapsibleState.Collapsed, permissionSet.type ?? 'PermissionSet', permissionSet.fullName, undefined, undefined, 'PermissionSet')
            );
        } catch (error) {
            return this.getErrorMessage(error, 'Permission Set metadata');
        }
    }

    private getPermissionSetFolders(permissionSetApiName?: string): MetadataNode[] {
        return [
            new MetadataNode('Object Permissions', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetObjectPermissionsFolder', undefined, permissionSetApiName),
            new MetadataNode('Field Permissions', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFieldPermissionsFolder', undefined, permissionSetApiName),
            new MetadataNode('Apex Class Access', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFolder', undefined, permissionSetApiName),
            new MetadataNode('Flow Access', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFolder', undefined, permissionSetApiName),
            new MetadataNode('Custom Permissions', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFolder', undefined, permissionSetApiName),
            new MetadataNode('Tab Settings', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFolder', undefined, permissionSetApiName),
            new MetadataNode('User Permissions', vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFolder', undefined, permissionSetApiName)
        ];
    }

    private async getPermissionSetObjectPermissions(permissionSetApiName?: string): Promise<MetadataNode[]> {
        const xml = await this.getPermissionSetXml(permissionSetApiName, 'object permission');

        if (Array.isArray(xml)) {
            return xml;
        }

        const permissions = parseObjectPermissions(xml);

        if (!permissions.length) {
            return [new MetadataNode('No object permissions found', vscode.TreeItemCollapsibleState.None, 'Info')];
        }

        return permissions.map((permission) =>
            new MetadataNode(permission.object, vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetObjectPermission', permission.object, permissionSetApiName, undefined, undefined, permission)
        );
    }

    private async getPermissionSetFieldPermissions(permissionSetApiName?: string): Promise<MetadataNode[]> {
        const xml = await this.getPermissionSetXml(permissionSetApiName, 'field permission');

        if (Array.isArray(xml)) {
            return xml;
        }

        const permissions = parseFieldPermissions(xml);

        if (!permissions.length) {
            return [new MetadataNode('No field permissions found', vscode.TreeItemCollapsibleState.None, 'Info')];
        }

        return permissions.map((permission) =>
            new MetadataNode(permission.field, vscode.TreeItemCollapsibleState.Collapsed, 'PermissionSetFieldPermission', permission.field, permissionSetApiName, undefined, undefined, undefined, permission)
        );
    }

    private async getPermissionSetXml(permissionSetApiName: string | undefined, label: string): Promise<string | MetadataNode[]> {
        if (!this.selectedOrgTarget || !permissionSetApiName) {
            return this.getSelectOrgMessage();
        }

        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
            return [new MetadataNode('Open an SFDX project to inspect permission set details', vscode.TreeItemCollapsibleState.None, 'Info')];
        }

        try {
            const root = folders[0].uri;
            const tempRoot = vscode.Uri.joinPath(root, '.better-org-browser', 'remote-permissions', `${permissionSetApiName}-${Date.now()}`);
            await this.createTemporarySfdxProject(tempRoot);
            await this.orgService.retrievePermissionSet(this.selectedOrgTarget, permissionSetApiName, tempRoot.fsPath);

            const permissionSetFile = vscode.Uri.joinPath(tempRoot, 'force-app', 'main', 'default', 'permissionsets', `${permissionSetApiName}.permissionset-meta.xml`);
            const bytes = await vscode.workspace.fs.readFile(permissionSetFile);

            return Buffer.from(bytes).toString('utf8');
        } catch (error) {
            return this.getErrorMessage(error, `Permission Set ${label}`);
        }
    }

    private async createTemporarySfdxProject(root: vscode.Uri): Promise<void> {
        const packageFolder = vscode.Uri.joinPath(root, 'force-app', 'main', 'default');
        const projectFile = vscode.Uri.joinPath(root, 'sfdx-project.json');
        const projectJson = {
            packageDirectories: [
                {
                    path: 'force-app',
                    default: true
                }
            ],
            name: 'better-org-browser-temp',
            namespace: '',
            sourceApiVersion: '60.0'
        };

        await vscode.workspace.fs.createDirectory(packageFolder);
        await vscode.workspace.fs.writeFile(projectFile, Buffer.from(`${JSON.stringify(projectJson, null, 2)}\n`, 'utf8'));
    }

    private getObjectPermissionDetails(permission?: ObjectPermission): MetadataNode[] {
        if (!permission) {
            return [new MetadataNode('No permission details available', vscode.TreeItemCollapsibleState.None, 'Info')];
        }

        return [
            this.getPermissionFlagNode('Read', permission.allowRead),
            this.getPermissionFlagNode('Create', permission.allowCreate),
            this.getPermissionFlagNode('Edit', permission.allowEdit),
            this.getPermissionFlagNode('Delete', permission.allowDelete),
            this.getPermissionFlagNode('View All Records', permission.viewAllRecords),
            this.getPermissionFlagNode('Modify All Records', permission.modifyAllRecords)
        ];
    }

    private getFieldPermissionDetails(permission?: FieldPermission): MetadataNode[] {
        if (!permission) {
            return [new MetadataNode('No permission details available', vscode.TreeItemCollapsibleState.None, 'Info')];
        }

        return [
            this.getPermissionFlagNode('Readable', permission.readable),
            this.getPermissionFlagNode('Editable', permission.editable)
        ];
    }

    private getPermissionFlagNode(label: string, value: boolean): MetadataNode {
        return new MetadataNode(`${label}: ${value ? 'Yes' : 'No'}`, vscode.TreeItemCollapsibleState.None, value ? 'PermissionGranted' : 'PermissionDenied');
    }

    private getSelectOrgMessage(): MetadataNode[] {
        return [new MetadataNode('Select a Salesforce org first', vscode.TreeItemCollapsibleState.None, 'Info')];
    }

    private getErrorMessage(error: unknown, label: string): MetadataNode[] {
        const message = error instanceof Error ? error.message : `Unknown ${label} error`;
        return [new MetadataNode(`Error: ${message}`, vscode.TreeItemCollapsibleState.None, 'Error')];
    }
}
