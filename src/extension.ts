import * as vscode from 'vscode';
import { MetadataProvider } from './metadata/metadataProvider';
import { MetadataNode } from './metadata/metadataNode';
import { MetadataService } from './salesforce/metadataService';
import { OrgService } from './salesforce/orgService';
import { loadSelectedOrg } from './salesforce/selectedOrgStore';
import { PackageXmlBuilder } from './packageXml/packageXmlBuilder';
import { loadManifestSelections, saveManifestSelections } from './packageXml/manifestSelectionStore';
import { PreviewProvider } from './workspace/previewProvider';
import { CommandContext } from './commands/commandContext';
import { registerOrgCommands } from './commands/orgCommands';
import { registerManifestCommands, selectionText } from './commands/manifestCommands';
import { registerRetrieveCommands } from './commands/retrieveCommands';
import { registerMetadataCommands } from './commands/metadataCommands';
import { registerPermissionSetCommands } from './commands/permissionSetCommands';
import { registerChildRetrieveCommands } from './commands/childRetrieveCommands';

export function activate(extension: vscode.ExtensionContext): { provider: MetadataProvider } {
    const cli = new OrgService();
    const service = new MetadataService(cli);
    const provider = new MetadataProvider(service);
    const tree = vscode.window.createTreeView<MetadataNode>('betterOrgBrowserView', { treeDataProvider: provider });
    const manifest = new PackageXmlBuilder();
    manifest.replaceSelections(loadManifestSelections(extension));
    const previews = new PreviewProvider();
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    status.command = 'betterOrgBrowser.showManifestSelections';
    status.tooltip = 'Show Better Org Browser manifest selections';
    const update = (): void => { status.text = `$(list-tree) Manifest: ${manifest.getCount()}`; status.show(); };
    const context: CommandContext = { extension, provider, tree, manifest, previews, saveSelections: async () => {
        await saveManifestSelections(extension, manifest.getSelections()); update();
        previews.update('selections.md', selectionText(context)); previews.update('package.xml', manifest.build());
    } };
    registerChildRetrieveCommands(context);
    const saved = loadSelectedOrg(extension);
    if (saved) { provider.setSelectedOrg(saved.label, saved.target); tree.description = saved.label; }
    const orgStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
    orgStatus.command = 'betterOrgBrowser.selectOrg';
    const updateOrgFeedback = (): void => {
        const label = provider.selectedOrgName;
        tree.description = label;
        tree.message = label ? `Selected org: ${label}` : undefined;
        orgStatus.text = label ? `$(database) Org: ${provider.selectedOrgTarget}` : '$(plug) Select Salesforce Org';
        orgStatus.tooltip = label ? `Selected Salesforce org: ${label}\nClick to change org` : 'Select a Salesforce org for Better Org Browser';
        orgStatus.show();
    };
    updateOrgFeedback();
    extension.subscriptions.push(cli, service, provider, tree, status, orgStatus, previews,
        provider.onDidChangeTreeData(updateOrgFeedback),
        vscode.workspace.registerTextDocumentContentProvider('better-org-browser', previews));
    registerOrgCommands(context);
    registerManifestCommands(context);
    registerRetrieveCommands(context);
    registerMetadataCommands(context);
    registerPermissionSetCommands(context);
    update();
    return { provider };
}
