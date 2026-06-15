import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';
import { MetadataNode } from './metadata/metadataNode';
import { PackageXmlBuilder } from './packageXml/packageXmlBuilder';
import { loadManifestSelections, saveManifestSelections } from './packageXml/manifestSelectionStore';
import { findFieldPermissionBlock, findObjectPermissionBlock, mergeFieldPermissionBlock, mergeObjectPermissionBlock } from './salesforce/permissionSetParser';
import { formatRetrieveResult } from './salesforce/retrieveResultFormatter';
import { OrgService, SalesforceOrg } from './salesforce/orgService';
import { loadSelectedOrg, saveSelectedOrg } from './salesforce/selectedOrgStore';
import { readTextFile, writeTextFile } from './workspace/textFile';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MetadataProvider();
    const orgService = new OrgService();
    const packageXmlBuilder = new PackageXmlBuilder();
    const retrieveOutputChannel = vscode.window.createOutputChannel('Better Org Browser Retrieve');
    const savedSelectedOrg = loadSelectedOrg(context);
    let selectedOrgTarget: string | undefined = savedSelectedOrg?.target;

    packageXmlBuilder.replaceSelections(loadManifestSelections(context));

    const manifestStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    manifestStatusBarItem.command = 'betterOrgBrowser.showManifestSelections';
    manifestStatusBarItem.tooltip = 'Show Better Org Browser manifest selections';

    const updateManifestStatusBarItem = (): void => {
        manifestStatusBarItem.text = `$(list-tree) Manifest: ${packageXmlBuilder.getCount()}`;
        manifestStatusBarItem.show();
    };

    updateManifestStatusBarItem();

    if (savedSelectedOrg) {
        provider.setSelectedOrg(savedSelectedOrg.label, savedSelectedOrg.target);
    }

    const saveSelections = async (): Promise<void> => {
        await saveManifestSelections(context, packageXmlBuilder.getSelections());
        updateManifestStatusBarItem();
    };

    vscode.window.registerTreeDataProvider('betterOrgBrowserView', provider);

    const getManifestMemberName = (node: MetadataNode): string => {
        return node.parentApiName && node.packageXmlType === 'CustomField'
            ? `${node.parentApiName}.${node.apiName}`
            : node.apiName ?? node.label;
    };

    const getPermissionSetFile = (root: vscode.Uri, permissionSetApiName: string): vscode.Uri =>
        vscode.Uri.joinPath(root, 'force-app', 'main', 'default', 'permissionsets', `${permissionSetApiName}.permissionset-meta.xml`);

    const findFileBySuffix = async (root: vscode.Uri, suffixes: string[]): Promise<vscode.Uri | undefined> => {
        const entries = await vscode.workspace.fs.readDirectory(root);

        for (const [name, type] of entries) {
            const child = vscode.Uri.joinPath(root, name);

            if (type === vscode.FileType.File && suffixes.some((suffix) => name.endsWith(suffix))) {
                return child;
            }

            if (type === vscode.FileType.Directory) {
                const found = await findFileBySuffix(child, suffixes);

                if (found) {
                    return found;
                }
            }
        }

        return undefined;
    };

    const findAnyPermissionSetFile = async (root: vscode.Uri): Promise<vscode.Uri> => {
        const found = await findFileBySuffix(root, ['.permissionset-meta.xml', '.permissionset']);

        if (!found) {
            throw new Error('Could not find retrieved permission set file.');
        }

        return found;
    };

    const syncPermissionSetEntry = async (
        node: MetadataNode,
        entryKind: 'field' | 'object',
        getEntryName: (node: MetadataNode) => string | undefined,
        findRemoteBlock: (xml: string, entryName: string) => string | undefined,
        mergeRemoteBlock: (localXml: string, remoteBlock: string, entryName: string) => string
    ): Promise<void> => {
        const folders = vscode.workspace.workspaceFolders;
        const targetOrg = selectedOrgTarget;
        const permissionSetApiName = node?.parentApiName;
        const entryName = getEntryName(node);

        if (!folders?.length) {
            vscode.window.showWarningMessage('Open an SFDX project before syncing a permission entry.');
            return;
        }

        if (!targetOrg) {
            vscode.window.showWarningMessage('Select a Salesforce org before syncing a permission entry.');
            return;
        }

        if (!permissionSetApiName || !entryName) {
            vscode.window.showWarningMessage(`No ${entryKind} permission entry selected.`);
            return;
        }

        const root = folders[0].uri;
        const permissionSetFile = getPermissionSetFile(root, permissionSetApiName);
        const tempRoot = vscode.Uri.joinPath(root, '.better-org-browser', 'permission-sync', `${permissionSetApiName}-${entryKind}-${Date.now()}`);

        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: `Syncing ${entryName}`, cancellable: false },
                async () => {
                    const localXml = await readTextFile(permissionSetFile);

                    await vscode.workspace.fs.createDirectory(tempRoot);
                    await orgService.retrievePermissionSetMetadataFormat(targetOrg, permissionSetApiName, root.fsPath, tempRoot.fsPath);

                    const remotePermissionSetFile = await findAnyPermissionSetFile(tempRoot);
                    const remoteBytes = await vscode.workspace.fs.readFile(remotePermissionSetFile);
                    const remoteXml = Buffer.from(remoteBytes).toString('utf8');
                    const remoteBlock = findRemoteBlock(remoteXml, entryName);

                    if (!remoteBlock) {
                        throw new Error(`Could not find remote ${entryKind} permission entry for ${entryName}.`);
                    }

                    const mergedXml = mergeRemoteBlock(localXml, remoteBlock, entryName);
                    await writeTextFile(permissionSetFile, mergedXml);
                }
            );

            vscode.window.showInformationMessage(`Synced ${entryKind} permission entry ${entryName} into ${permissionSetApiName}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown permission sync error';
            vscode.window.showErrorMessage(`Permission sync failed: ${message}`);
        }
    };

    const refreshCommand = vscode.commands.registerCommand('betterOrgBrowser.refresh', () => {
        provider.refresh();
    });

    const selectOrgCommand = vscode.commands.registerCommand('betterOrgBrowser.selectOrg', async () => {
        try {
            const orgs = await orgService.listAuthorizedOrgs();

            if (orgs.length === 0) {
                vscode.window.showWarningMessage('No authorized Salesforce orgs were found.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                orgs.map((org: SalesforceOrg) => ({ label: orgService.getOrgDisplayName(org), description: org.instanceUrl, org })),
                { placeHolder: 'Select a Salesforce org' }
            );

            if (!selected) {
                return;
            }

            selectedOrgTarget = orgService.getOrgTargetName(selected.org);
            await saveSelectedOrg(context, { label: selected.label, target: selectedOrgTarget });
            provider.setSelectedOrg(selected.label, selectedOrgTarget);
            vscode.window.showInformationMessage(`Connected to ${selected.label}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Salesforce CLI error';
            vscode.window.showErrorMessage(message);
        }
    });

    const showFieldDetailsCommand = vscode.commands.registerCommand('betterOrgBrowser.showFieldDetails', async (node: MetadataNode) => {
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
    });

    const copyApiNameCommand = vscode.commands.registerCommand('betterOrgBrowser.copyApiName', async (node: MetadataNode) => {
        if (!node) {
            vscode.window.showWarningMessage('No metadata item selected.');
            return;
        }

        const value = node.parentApiName && node.apiName ? `${node.parentApiName}.${node.apiName}` : node.apiName ?? node.label;
        await vscode.env.clipboard.writeText(value);
        vscode.window.showInformationMessage(`Copied ${value}`);
    });

    const addToManifestCommand = vscode.commands.registerCommand('betterOrgBrowser.addToManifest', async (node: MetadataNode) => {
        if (!node?.packageXmlType) {
            vscode.window.showWarningMessage('This metadata item cannot be added to package.xml yet.');
            return;
        }

        const memberName = getManifestMemberName(node);
        packageXmlBuilder.add(node.packageXmlType, memberName);
        await saveSelections();
        vscode.window.showInformationMessage(`Added ${memberName} to package.xml selections (${packageXmlBuilder.getCount()} total)`);
    });

    const removeFromManifestCommand = vscode.commands.registerCommand('betterOrgBrowser.removeFromManifest', async (node: MetadataNode) => {
        if (!node?.packageXmlType) {
            vscode.window.showWarningMessage('This metadata item cannot be removed from package.xml yet.');
            return;
        }

        const memberName = getManifestMemberName(node);
        const removed = packageXmlBuilder.remove(node.packageXmlType, memberName);

        if (!removed) {
            vscode.window.showInformationMessage(`${memberName} was not in package.xml selections.`);
            return;
        }

        await saveSelections();
        vscode.window.showInformationMessage(`Removed ${memberName} from package.xml selections (${packageXmlBuilder.getCount()} total)`);
    });

    const clearManifestSelectionsCommand = vscode.commands.registerCommand('betterOrgBrowser.clearManifestSelections', async () => {
        const count = packageXmlBuilder.getCount();

        if (count === 0) {
            vscode.window.showInformationMessage('No package.xml selections to clear.');
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            `Clear ${count} package.xml selection${count === 1 ? '' : 's'}?`,
            { modal: true },
            'Clear Selections'
        );

        if (choice !== 'Clear Selections') {
            return;
        }

        packageXmlBuilder.clear();
        await saveSelections();
        vscode.window.showInformationMessage('Cleared package.xml selections.');
    });

    const showManifestSelectionsCommand = vscode.commands.registerCommand('betterOrgBrowser.showManifestSelections', async () => {
        const selections = packageXmlBuilder.getSelections();

        if (selections.length === 0) {
            vscode.window.showInformationMessage('No package.xml selections yet.');
            return;
        }

        const lines = ['# Package XML Selections', '', `Total selections: ${selections.length}`, '', ...selections.map((selection) => `- ${selection.type}: ${selection.member}`), ''];
        const document = await vscode.workspace.openTextDocument({ content: lines.join('\n'), language: 'markdown' });
        await vscode.window.showTextDocument(document, { preview: false });
    });

    const previewManifestCommand = vscode.commands.registerCommand('betterOrgBrowser.previewManifest', async () => {
        const xml = packageXmlBuilder.build();
        const document = await vscode.workspace.openTextDocument({ content: xml, language: 'xml' });
        await vscode.window.showTextDocument(document, { preview: false });
    });

    const writeManifestCommand = vscode.commands.registerCommand('betterOrgBrowser.writeManifest', async () => {
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
    });

    const syncFieldPermissionEntryCommand = vscode.commands.registerCommand('betterOrgBrowser.syncFieldPermissionEntry', async (node: MetadataNode) => {
        await syncPermissionSetEntry(
            node,
            'field',
            (selectedNode) => selectedNode?.fieldPermission?.field ?? selectedNode?.apiName,
            findFieldPermissionBlock,
            mergeFieldPermissionBlock
        );
    });

    const syncObjectPermissionEntryCommand = vscode.commands.registerCommand('betterOrgBrowser.syncObjectPermissionEntry', async (node: MetadataNode) => {
        await syncPermissionSetEntry(
            node,
            'object',
            (selectedNode) => selectedNode?.objectPermission?.object ?? selectedNode?.apiName,
            findObjectPermissionBlock,
            mergeObjectPermissionBlock
        );
    });

    const retrieveManifestCommand = vscode.commands.registerCommand('betterOrgBrowser.retrieveManifest', async () => {
        const folders = vscode.workspace.workspaceFolders;

        if (!folders?.length) {
            vscode.window.showWarningMessage('Open a Salesforce DX project before retrieving metadata.');
            return;
        }

        const targetOrg = selectedOrgTarget;

        if (!targetOrg) {
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

        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Retrieving Salesforce metadata', cancellable: false },
                async () => {
                    retrieveOutputChannel.appendLine(`[${new Date().toISOString()}] Retrieving manifest/package.xml from ${targetOrg}`);
                    const output = await orgService.retrieveManifest(targetOrg, 'manifest/package.xml', root.fsPath);
                    retrieveOutputChannel.appendLine(output);
                    retrieveOutputChannel.appendLine('');
                    const document = await vscode.workspace.openTextDocument({ content: formatRetrieveResult(output), language: 'markdown' });
                    await vscode.window.showTextDocument(document, { preview: false });
                }
            );

            vscode.window.showInformationMessage('Retrieve complete.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown retrieve error';
            retrieveOutputChannel.appendLine(`[${new Date().toISOString()}] Retrieve failed`);
            retrieveOutputChannel.appendLine(message);
            retrieveOutputChannel.show(true);
            vscode.window.showErrorMessage(`Retrieve failed: ${message}`);
        }
    });

    context.subscriptions.push(
        manifestStatusBarItem,
        retrieveOutputChannel,
        refreshCommand,
        selectOrgCommand,
        showFieldDetailsCommand,
        copyApiNameCommand,
        addToManifestCommand,
        removeFromManifestCommand,
        clearManifestSelectionsCommand,
        showManifestSelectionsCommand,
        previewManifestCommand,
        writeManifestCommand,
        syncFieldPermissionEntryCommand,
        syncObjectPermissionEntryCommand,
        retrieveManifestCommand
    );

    console.log('Better Org Browser activated.');
}

export function deactivate(): void {
    // Cleanup logic can go here later.
}
