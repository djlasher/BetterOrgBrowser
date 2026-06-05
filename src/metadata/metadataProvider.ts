import * as vscode from 'vscode';
import { MetadataNode } from './metadataNode';

export class MetadataProvider implements vscode.TreeDataProvider<MetadataNode> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<MetadataNode | undefined | void> =
        new vscode.EventEmitter<MetadataNode | undefined | void>();

    readonly onDidChangeTreeData: vscode.Event<MetadataNode | undefined | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MetadataNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MetadataNode): Thenable<MetadataNode[]> {
        if (!element) {
            return Promise.resolve([
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
            ]);
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
