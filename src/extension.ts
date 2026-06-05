import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';
import { MetadataNode } from './metadata/metadataNode';
import { PackageXmlBuilder } from './packageXml/packageXmlBuilder';
import { OrgService, SalesforceOrg } from './salesforce/orgService';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MetadataProvider();
    const orgService = new OrgService();
    const packageXmlBuilder = new PackageXmlBuilder();
    let selectedOrgTarget: string | undefined;

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

                selectedOrgTarget = orgService.getOrgTargetName(selected.org);

                provider.setSelectedOrg(
                    selected.label,
                    selectedOrgTarget
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

    const addToManifestCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.addToManifest',
        async (node: MetadataNode) => {
            if (!node?.packageXmlType) {
                vscode.window.showWarningMessage('This metadata item cannot be added to package.xml yet.');
                return;
            }

            const memberName = node.parentApiName && node.packageXmlType === 'CustomField'
                ? `${node.parentApiName}.${node.apiName}`
                : node.apiName ?? node.label;

            packageXmlBuilder.add(node.packageXmlType, memberName);

            vscode.window.showInformationMessage(
                `Added ${memberName} to package.xml selections (${packageXmlBuilder.getCount()} total)`
            );
        }
    );

    const previewManifestCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.previewManifest',
        async () => {
            const xml = packageXmlBuilder.build();

            const document = await vscode.workspace.openTextDocument({
                content: xml,
                language: 'xml'
            });

            await vscode.window.showTextDocument(document, {
                preview: false
            });
        }
    );

    const writeManifestCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.writeManifest',
        async () => {
            const folders = vscode.workspace.workspaceFolders;

            if (!folders?.length) {
                vscode.window.showWarningMessage('Open a workspace folder before writing package.xml.');
                return;
            }

            const manifestFolder = vscode.Uri.joinPath(folders[0].uri, 'manifest');
            const manifestFile = vscode.Uri.joinPath(manifestFolder, 'package.xml');
            const xml = packageXmlBuilder.build();

            await vscode.workspace.fs.createDirectory(manifestFolder);
            await vscode.workspace.fs.writeFile(manifestFile, Buffer.from(xml, 'utf8'));

            const document = await vscode.workspace.openTextDocument(manifestFile);
            await vscode.window.showTextDocument(document, { preview: false });

            vscode.window.showInformationMessage('Wrote manifest/package.xml');
        }
    );

    const retrieveManifestCommand = vscode.commands.registerCommand(
        'betterOrgBrowser.retrieveManifest',
        async () => {
            const folders = vscode.workspace.workspaceFolders;

            if (!folders?.length) {
                vscode.window.showWarningMessage('Open a Salesforce DX project before retrieving metadata.');
                return;
            }

            if (!selectedOrgTarget) {
                vscode.window.showWarningMessage('Select a Salesforce org before retrieving metadata.');
                return;
            }

            const root = folders[0].uri;
            const projectFile = vscode.Uri.joinPath(root, 'sfdx-project.json');
            const manifestFile = vscode.Uri.joinPath(root, 'manifest', 'package.xml');

            try {
                await vscode.workspace.fs.stat(projectFile);
                await vscode.workspace.fs.stat(manifestFile);
            } catch {
                vscode.window.showWarningMessage('Missing sfdx-project.json or manifest/package.xml.');
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Retrieving Salesforce metadata',
                    cancellable: false
                },
                async () => {
                    const output = await orgService.retrieveManifest(
                        selectedOrgTarget,
                        'manifest/package.xml',
                        root.fsPath
                    );

                    const document = await vscode.workspace.openTextDocument({
                        content: output,
                        language: 'json'
                    });

                    await vscode.window.showTextDocument(document, { preview: false });
                }
            );

            vscode.window.showInformationMessage('Retrieve complete.');
        }
    );

    context.subscriptions.push(
        refreshCommand,
        selectOrgCommand,
        showFieldDetailsCommand,
        copyApiNameCommand,
        addToManifestCommand,
        previewManifestCommand,
        writeManifestCommand,
        retrieveManifestCommand
    );

    console.log('Better Org Browser activated.');
}

export function deactivate(): void {
    // Cleanup logic can go here later.
}
