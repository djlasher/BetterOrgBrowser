const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {parseFieldPermissions}=require('../../out/salesforce/permissionSetParser');
exports.run=async()=>{
    const report={checks:[],errors:[]};
    try {
        const extension=vscode.extensions.getExtension('djlasher.better-org-browser');
        const {provider}=await extension.activate();
        assert.deepEqual(await provider.getChildren(),[]);
        assert.ok(extension.packageJSON.contributes.viewsWelcome.some(entry=>entry.contents.includes('[Select Salesforce Org]')));
        provider.setSelectedOrg('Offline regression org','offline-qa');
        const override='Case.High_Risk_Override__c',reason='Case.High_Risk_Reason__c';
        const field=(name,readable='true')=>`<fieldPermissions><editable>false</editable><field>${name}</field><readable>${readable}</readable></fieldPermissions>`;
        const wrap=content=>`<?xml version="1.0" encoding="UTF-8"?>\r\n<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">\r\n${content}\r\n</PermissionSet>\r\n`;
        // Only the network boundary is replaced; tree parsing, command dispatch,
        // project discovery, WorkspaceEdit and save use the real extension host.
        provider.service.list=async()=>[{fullName:'Regression'}];
        provider.service.xml=async()=>wrap(field(override)+field(reason));
        const root=(await provider.getChildren()).find(node=>node.definition?.type==='PermissionSet');
        const permission=(await provider.getChildren(root))[0];
        const section=(await provider.getChildren(permission)).find(node=>node.label==='Field Permissions');
        const selected=section.children.find(node=>node.name===override);
        const project=vscode.workspace.workspaceFolders[0].uri;
        const uri=vscode.Uri.joinPath(project,'force-app','main','default','permissionsets','Regression.permissionset-meta.xml');
        const local=wrap('    <label>Regression</label>\r\n    '+field(reason,'false')+'\r\n\r\n    <tabSettings><tab>Case</tab><visibility>Visible</visibility></tabSettings>\r\n    '+field(override)+'\r\n\r\n');
        await vscode.workspace.fs.writeFile(uri,Buffer.from(local));
        const document=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(document);
        const edit=new vscode.WorkspaceEdit();edit.insert(uri,new vscode.Position(2,0),'    <!-- Keep my unsaved edit -->\r\n');
        assert.ok(await vscode.workspace.applyEdit(edit));assert.ok(document.isDirty);
        await vscode.commands.executeCommand('betterOrgBrowser.syncPermissionSetEntry',selected);
        const result=document.getText();
        assert.ok(result.indexOf(override)<result.indexOf(reason));
        assert.ok(result.indexOf(reason)<result.indexOf('<tabSettings>'));
        assert.doesNotMatch(result,/\n[ \t\r]*\n/);
        assert.match(result,/Keep my unsaved edit/);
        assert.equal(parseFieldPermissions(result).find(entry=>entry.field===reason).readable,false);
        assert.equal(document.isDirty,false);
        assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'),result);
        await vscode.commands.executeCommand('betterOrgBrowser.syncPermissionSetEntry',selected);
        assert.equal(document.getText(),result);
        report.checks.push({name:'Moved field resync: sorted section, blank gap cleanup, local value preservation, dirty-editor save, idempotence',status:'passed'});
        report.checks.push({name:'Welcome contribution and empty initial tree',status:'passed'});
    }catch(error){report.errors.push({error:String(error),stack:error.stack});}
    await fs.writeFile(process.env.BOB_TEST_REPORT,JSON.stringify(report,null,2));
    if(report.errors.length)throw new Error('Offline host regression failed');
};
