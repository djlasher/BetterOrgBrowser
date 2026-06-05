import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';
import { MetadataListItem, OrgService } from '../salesforce/orgService';

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
                    'CustomObject'
                ),
                new MetadataNode(
                    'Apex Classes',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'ApexClass'
                ),
                new MetadataNode(
                    'Flows',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'Flow'
                ),
                new MetadataNode(
                    'Permission Sets',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'PermissionSet'
                )
            );

            return rootNodes;
        }

        switch (element.label) {
            case 'Custom Objects':
                return [
                    new MetadataNode(
                        'Account',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'CustomObject'
                    ),
                    new MetadataNode(
                        'Contact',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'CustomObject'
                    )
                ];

            case 'Apex Classes':
                if (!this.selectedOrgTarget) {
                    return [
                        new MetadataNode(
                            'Select a Salesforce org first',
                            vscode.TreeItemCollapsibleState.None,
                            'Info'
                        )
                    ];
                }

                try {
                    const apexClasses = await this.orgService.listApexClasses(this.selectedOrgTarget);

                    return apexClasses.map((apexClass: MetadataListItem) =>
                        new MetadataNode(
                            apexClass.fullName,
                            vscode.TreeItemCollapsibleState.None,
                            apexClass.type ?? 'ApexClass'
                        )
                    );
                } catch (error) {
                    const message = error instanceof Error
                        ? error.message
                        : 'Unknown Apex metadata error';

                    return [
                        new MetadataNode(
                            `Error: ${message}`,
                            vscode.TreeItemCollapsibleState.None,
                            'Error'
                        )
                    ];
                }

            case 'Flows':
                if (!this.selectedOrgTarget) {
                    return [
                        new MetadataNode(
                            'Select a Salesforce org first',
                            vscode.TreeItemCollapsibleState.None,
                            'Info'
                        )
                    ];
                }

                try {
                    const flows = await this.orgService.listFlows(this.selectedOrgTarget);

                    return flows.map((flow: MetadataListItem) =>
                        new MetadataNode(
                            flow.fullName,
                            vscode.TreeItemCollapsibleState.None,
                            flow.type ?? 'Flow'
                        )
                    );
                } catch (error) {
                    const message = error instanceof Error
                        ? error.message
                        : 'Unknown Flow metadata error';

                    return [
                        new MetadataNode(
                            `Error: ${message}`,
                            vscode.TreeItemCollapsibleState.None,
                            'Error'
                        )
                    ];
                }

            case 'Account':
                return [
                    new MetadataNode(
                        'Fields',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'CustomField'
                    ),
                    new MetadataNode(
                        'Validation Rules',
                        vscode.TreeItemCollapsibleState.None,
                        'ValidationRule'
                    )
                ];

            case 'Fields':
                return [
                    new MetadataNode(
                        'AccountNumber',
                        vscode.TreeItemCollapsibleState.None,
                        'CustomField'
                    ),
                    new MetadataNode(
                        'Industry',
                        vscode.TreeItemCollapsibleState.None,
                        'CustomField'
                    )
                ];

            default:
                return [];
        }
    }
}
