import * as vscode from 'vscode';
import { PackageXmlMember } from './packageXmlBuilder';

export const manifestSelectionStorageKey = 'betterOrgBrowser.manifestSelections';

export function loadManifestSelections(context: vscode.ExtensionContext): PackageXmlMember[] {
    return context.workspaceState.get<PackageXmlMember[]>(manifestSelectionStorageKey, []);
}

export async function saveManifestSelections(
    context: vscode.ExtensionContext,
    selections: PackageXmlMember[]
): Promise<void> {
    await context.workspaceState.update(manifestSelectionStorageKey, selections);
}
