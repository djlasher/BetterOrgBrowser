import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';
import { MetadataNode } from './metadata/metadataNode';
import { OrgService, SalesforceOrg } from './salesforce/orgService';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MetadataProvider();
    const orgService = new OrgService();

    vscode.window.registerTreeDataProvider(
        'betterOrgBrowserView',
        provider
    );

    const refreshCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.refresh',
        () => {
            provider.refresh();
        }
    );

    const selectOrgCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.selectOrg',
        async () => {
            try {
                const orgs = await orgService.listAuthorizedOrgs();

                if (orgs.length === 0) {
                    vscode.window.showWarningMessage(
                        'No authorized Salesforce orgs were found.'
                    );

                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    orgs.map((org: SalesforceOrg) => ({
                        label: orgService.getOrgDisplayName(org),
                        description: org.instanceUrl,
                        org
                    })),
                    {
                        placeHolder: 'Select a Salesforce org'
                    }
                );

                if (!selected) {
                    return;
                }

                provider.setSelectedOrg(
                    selected.label,
                    orgService.getOrgTargetName(selected.org)
                );
                vscode.window.showInformationMessage(
                    `Connected to ${selected.label}`
                );
            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : 'Unknown Salesforce CLI error';

                vscode.window.showErrorMessage(message);
            }
        }
    );

    const showFieldDetailsCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.showFieldDetails',
        async (node: MetadataNode) => {
            if (!node?.fieldDetails) {
                vscode.window.showWarningMessage('No field details are available for this item.');
                return;
            }

            const field = node.fieldDetails;
            const details = [
                `Object: ${node.parentApiName ?? 'Unknown'}`,
                `API Name: ${field.name}`,
                `Label: ${field.label ?? ''}`,
                `Type: ${field.type ?? ''}`,
                `Required: ${field.nillable === false ? 'Yes' : 'No'}`,
                `Createable: ${field.createable ? 'Yes' : 'No'}`,
                `Updateable: ${field.updateable ? 'Yes' : 'No'}`,
                `Calculated: ${field.calculated ? 'Yes' : 'No'}`
            ].join('\n');

            await vscode.window.showInformationMessage(details, { modal: true });
        }
    );

    const copyApiNameCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.copyApiName',
        async (node: MetadataNode) => {
            if (!node) {
                vscode.window.showWarningMessage('No metadata item selected.');
                return;
            }

            const value = node.parentApiName && node.apiName
                ? `${node.parentApiName}.${node.apiName}`
                : node.apiName ?? node.label;

            await vscode.env.clipboard.writeText(value);
            vscode.window.showInformationMessage(`Copied ${value}`);
        }
    );

    context.subscriptions.push(
        refreshCommand,
        selectOrgCommand,
        showFieldDetailsCommand,
        copyApiNameCommand
    );

    console.log('Better Org Browser activated.');
}

export function deactivate(): void {
    // Cleanup logic can go here later.
}
