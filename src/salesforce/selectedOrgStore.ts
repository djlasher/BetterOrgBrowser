import * as vscode from 'vscode';

export interface SelectedOrgState {
    label: string;
    target: string;
}

const key = 'betterOrgBrowser.selectedOrg';

export function loadSelectedOrg(context: vscode.ExtensionContext): SelectedOrgState | undefined {
    return context.workspaceState.get<SelectedOrgState>(key);
}

export async function saveSelectedOrg(
    context: vscode.ExtensionContext,
    selectedOrg: SelectedOrgState
): Promise<void> {
    await context.workspaceState.update(key, selectedOrg);
}
