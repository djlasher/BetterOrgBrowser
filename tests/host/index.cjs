const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { metadataPath } = require('../../out/metadata/metadataModel');
const { parsePermissionSet } = require('../../out/metadata/parsers/permissionSetParser');
const report = { checks: [], roots: [], errors: [] };
exports.run = async function () {
    const extension = vscode.extensions.getExtension('djlasher.better-org-browser');
    assert.ok(extension, 'Development extension installed');
    const { provider } = await extension.activate();
    const org = process.env.BOB_TEST_ORG;
    assert.ok(org, 'Set BOB_TEST_ORG for live read-only Salesforce validation');
    const project = vscode.workspace.workspaceFolders[0].uri;
    const check = async (name, action) => {
        try { await action(); report.checks.push({ name, status: 'passed' }); }
        catch (error) { report.errors.push({ name, error: String(error), stack: error.stack }); }
        await fs.writeFile(process.env.BOB_TEST_REPORT, JSON.stringify(report,null,2));
    };
    provider.setSelectedOrg('Live QA', org);
    const roots = await provider.getChildren();
    await check('all metadata roots list against live org', async () => {
        for (const root of roots) {
            const children = await provider.getChildren(root);
            report.roots.push({type:root.definition.type,count:children.filter(n=>n.kind!=='Info').length,
                errors:children.filter(n=>n.kind==='Error').map(n=>n.label)});
            await fs.writeFile(process.env.BOB_TEST_REPORT, JSON.stringify(report,null,2));
        }
        assert.equal(report.roots.filter(r=>r.errors.length).length,0,JSON.stringify(report.roots.filter(r=>r.errors.length)));
    });
    const find = async (type, preferred) => {
        const items=await provider.getChildren(roots.find(r=>r.definition.type===type));
        const node=items.find(n=>n.name===preferred) ?? items.find(n=>n.kind===type);
        assert.ok(node,`No ${type} available`); return node;
    };
    const expand = async node => {
        const children=await provider.getChildren(node);
        assert.equal(children.filter(n=>n.kind==='Error').length,0,children.map(n=>n.label).join('\n'));
        return children;
    };
    await check('CustomObject metadata and describe fields', async()=>{
        const account=await find('CustomObject','Account');
        const sections=await expand(account);
        const fields=await expand(sections.find(n=>n.label==='Fields'));
        assert.ok(fields.length>0); assert.ok(fields.find(n=>n.name==='Name'));
        const field=fields.find(n=>n.data.manifest); assert.ok(field);
        const previousClipboard=await vscode.env.clipboard.readText();
        try {
            await vscode.commands.executeCommand('betterOrgBrowser.copyFullMetadataPath',field);
            assert.equal(await vscode.env.clipboard.readText(),metadataPath(field));
        } finally { await vscode.env.clipboard.writeText(previousClipboard); }
        await vscode.commands.executeCommand('betterOrgBrowser.showFieldDetails',field);
        assert.equal(vscode.window.activeTextEditor.document.uri.scheme,'better-org-browser');
    });
    await check('Flow semantic drilldown and no invalid child manifest',async()=>{
        const flow=await find('Flow','Scenario001_Case_High_Risk_Flagging');
        const sections=await expand(flow); assert.ok(sections.length>0);
        for(const section of sections)assert.equal(section.data.manifest,undefined);
        await vscode.commands.executeCommand('betterOrgBrowser.addToManifest',flow);
        await vscode.commands.executeCommand('betterOrgBrowser.previewManifest');
        assert.match(vscode.window.activeTextEditor.document.getText(),/<name>Flow<\/name>/);
        await vscode.commands.executeCommand('betterOrgBrowser.retrieveSelectedMetadata');
        const files=await vscode.workspace.findFiles('force-app/**/*.flow-meta.xml'); assert.ok(files.length>0,'Source retrieve wrote a Flow');
        await assert.rejects(fs.stat(path.join(project.fsPath,'manifest','package.xml')),{code:'ENOENT'});
        await vscode.commands.executeCommand('betterOrgBrowser.removeFromManifest',flow);
    });
    await check('Permission Set sync updates only selected entries and saves dirty editor',async()=>{
        const permission=await find('PermissionSet','Claygentforce_Support_Manager');
        const sections=await expand(permission);
        const entries=sections.flatMap(n=>n.children??[]).filter(n=>n.data.sync);
        assert.ok(entries.length>0);
        const target=vscode.Uri.joinPath(project,'force-app','main','default','permissionsets',permission.name+'.permissionset-meta.xml');
        await vscode.workspace.fs.writeFile(target,Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\r\n<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">\r\n    <label>QA trimmed</label>\r\n</PermissionSet>\r\n'));
        const document=await vscode.workspace.openTextDocument(target); await vscode.window.showTextDocument(document);
        const edit=new vscode.WorkspaceEdit(); edit.insert(target,new vscode.Position(2,0),'    <!-- Keep dirty edit -->\r\n');
        assert.ok(await vscode.workspace.applyEdit(edit)); assert.ok(document.isDirty);
        const selected=[];
        for(const section of sections){const entry=section.children?.find(n=>n.data.sync);if(entry)selected.push(entry);}
        for(const entry of selected)await vscode.commands.executeCommand('betterOrgBrowser.syncPermissionSetEntry',entry);
        assert.equal(document.isDirty,false); assert.match(document.getText(),/Keep dirty edit/);
        assert.equal(parsePermissionSet(document.getText()).flatMap(s=>s.children??[]).length,selected.length);
        const before=document.getText();
        await vscode.commands.executeCommand('betterOrgBrowser.syncPermissionSetEntry',selected[0]);assert.equal(document.getText(),before);
        report.permissionSections=sections.map(n=>n.label);
    });
    for(const type of ['Layout','FlexiPage','CustomApplication','PermissionSetGroup','CustomMetadata','Profile','LightningComponentBundle','AuraDefinitionBundle']){
        await check(`${type} live expansion when present`,async()=>{
            const items=await provider.getChildren(roots.find(r=>r.definition.type===type));
            const node=items.find(n=>n.kind===type);
            if(!node){report.checks.push({name:`${type} content`,status:'unavailable in org'});return;}
            const children=await expand(node);report.checks.push({name:`${type} child count`,count:children.length});
        });
    }
    for(const type of ['Report','Dashboard','EmailTemplate'])await check(`${type} folder expansion`,async()=>{
        const folders=await provider.getChildren(roots.find(r=>r.definition.type===type));
        for(const folder of folders.filter(n=>n.kind==='Folder').slice(0,2))await expand(folder);
    });
    await check('refresh clears cache and retains functioning tree',async()=>{
        await vscode.commands.executeCommand('betterOrgBrowser.refresh');
        assert.equal((await provider.getChildren()).length,roots.length);
        const classes=(await provider.getChildren()).find(n=>n.definition.type==='ApexClass');await expand(classes);
    });
    await fs.writeFile(process.env.BOB_TEST_REPORT,JSON.stringify(report,null,2));
    if(report.errors.length)throw new Error(`${report.errors.length} live checks failed; see ${process.env.BOB_TEST_REPORT}`);
};
