import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';
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

                provider.setSelectedOrg(selected.label);

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

    context.subscriptions.push(refreshCommand, selectOrgCommand);

    console.log('Better Org Browser activated.');
}

export function deactivate(): void {
    // Cleanup logic can go here later.
}
