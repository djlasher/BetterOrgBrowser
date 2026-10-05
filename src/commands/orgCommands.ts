import * as vscode from 'vscode';
import { saveSelectedOrg } from '../salesforce/selectedOrgStore';
import { CommandContext, register } from './commandContext';
export function registerOrgCommands(context: CommandContext): void {
    const { provider } = context;
    register(context, 'refresh', () => provider.refresh());
    register(context, 'selectOrg', async () => {
        const cli = provider.service.cli;
        const orgs = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Loading authorized orgs' }, () => cli.listAuthorizedOrgs());
        if (!orgs.length) { throw new Error('No authorized Salesforce orgs found. Authenticate with Salesforce CLI first.'); }
        const pick = await vscode.window.showQuickPick(orgs.map(org => ({ label: cli.getOrgDisplayName(org), description: org.instanceUrl, org })), { placeHolder: 'Select Salesforce org' });
        if (!pick) { return; }
        const target = cli.getOrgTargetName(pick.org);
        await saveSelectedOrg(context.extension, { label: pick.label, target });
        provider.setSelectedOrg(pick.label, target); context.tree.description = pick.label;
    });
}
