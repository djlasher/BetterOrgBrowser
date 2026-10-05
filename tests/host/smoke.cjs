const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
exports.run=async()=>{
    const extension=vscode.extensions.getExtension('djlasher.better-org-browser');
    assert.ok(extension,'Installed VSIX discovered');
    const {provider}=await extension.activate();
    assert.ok(provider,'Installed extension activated with dependencies');
    const commands=await vscode.commands.getCommands(true);
    for(const name of ['refresh','retrieveSelectedMetadata','syncPermissionSetEntry','searchMetadata']) {
        assert.ok(commands.includes('betterOrgBrowser.'+name),name);
    }
    await vscode.commands.executeCommand('betterOrgBrowser.previewManifest');
    assert.equal(vscode.window.activeTextEditor.document.uri.scheme,'better-org-browser');
    assert.match(vscode.window.activeTextEditor.document.getText(),/<Package xmlns=/);
    await fs.writeFile(process.env.BOB_TEST_REPORT,JSON.stringify({installedVsix:'passed',activation:'passed',commands:'passed',readonlyPreview:'passed'}));
};
