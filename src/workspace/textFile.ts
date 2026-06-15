import * as vscode from 'vscode';

export async function readTextFile(uri: vscode.Uri): Promise<string> {
    const openDocument = findOpenDocument(uri);

    if (openDocument) {
        return openDocument.getText();
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString('utf8');
}

export async function writeTextFile(uri: vscode.Uri, content: string): Promise<void> {
    const openDocument = findOpenDocument(uri);

    if (!openDocument) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        return;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        openDocument.positionAt(0),
        openDocument.positionAt(openDocument.getText().length)
    );

    edit.replace(uri, fullRange, content);
    const applied = await vscode.workspace.applyEdit(edit);

    if (!applied) {
        throw new Error(`Could not update open document ${uri.fsPath}.`);
    }

    await openDocument.save();
}

function findOpenDocument(uri: vscode.Uri): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
}
