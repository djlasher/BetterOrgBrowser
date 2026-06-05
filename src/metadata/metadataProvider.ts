import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';

export class MetadataProvider implements vscode.TreeDataProvider<MetadataNode> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<MetadataNode | undefined | void> =
        new vscode.EventEmitter<MetadataNode | undefined | void>();

    private selectedOrgName: string | undefined;

    readonly onDidChangeTreeData: vscode.Event<MetadataNode | undefined | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSelectedOrg(orgName: string | undefined): void {
        this.selectedOrgName = orgName;
        this.refresh();
    }

    getTreeItem(element: MetadataNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MetadataNode): Thenable<MetadataNode[]> {
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

            return Promise.resolve(rootNodes);
        }

        switch (element.label) {
            case 'Custom Objects':
                return Promise.resolve([
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
                ]);

            case 'Account':
                return Promise.resolve([
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
                ]);

            case 'Fields':
                return Promise.resolve([
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
                ]);

            default:
                return Promise.resolve([]);
        }
    }
}
