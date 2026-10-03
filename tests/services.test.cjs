const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const Module = require('node:module');
const originalLoad = Module._load;
const handlers = new Map();
const vscode = {
    TreeItem: class {}, ThemeIcon: class {}, TreeItemCollapsibleState:{None:0,Collapsed:1},
    EventEmitter:class {event=()=>({dispose(){}});fire(){}dispose(){}},
    StatusBarAlignment:{Left:1},
    commands:{registerCommand:(id,callback)=>{handlers.set(id,callback);return {dispose(){}};}},
    workspace:{registerTextDocumentContentProvider:()=>({dispose(){}})},
    window:{showErrorMessage:()=>new Promise(()=>{}),createOutputChannel:()=>({appendLine(){},show(){},dispose(){}}),
        createTreeView:()=>({dispose(){}}),createStatusBarItem:()=>({show(){},dispose(){}})}
};
Module._load=function(name,...args) {
    if(name==='vscode')return vscode;
    if(name==='../workspace/project')return {projectRoot:async()=>({fsPath:process.cwd()})};
    return originalLoad.call(this,name,...args);
};
const {MetadataService}=require('../out/salesforce/metadataService');
const {activate}=require('../out/extension');
Module._load=originalLoad;
test('every contributed command is registered and menu references are valid',()=>{
    const extension={subscriptions:[],workspaceState:{get:(_,fallback)=>fallback,update:async()=>{}}};
    activate(extension);
    const config=require('../package.json');
    const declared=new Set(config.contributes.commands.map(c=>c.command));
    assert.deepEqual(new Set(handlers.keys()),declared);
    for(const items of Object.values(config.contributes.menus))for(const item of items)assert.ok(declared.has(item.command));
    assert.ok(config.contributes.menus['view/item/context'].find(m=>m.command.endsWith('addToManifest')).when.includes(':manifest'));
    for(const disposable of extension.subscriptions)disposable.dispose();
});
test('command errors return without waiting for notification dismissal',async()=>{
    const result=await Promise.race([
        handlers.get('betterOrgBrowser.copyApiName')().then(()=> 'returned'),
        new Promise(resolve=>setTimeout(()=>resolve('blocked'),100))
    ]);
    assert.equal(result,'returned');
});
test('remote retrieval coalesces, matches exact component, and removes temporary files',async()=>{
    let calls=0, temp;
    const cli={retrieveMetadataFormat:async(org,type,name,cwd,directory)=>{
        calls++;temp=directory;
        await fs.mkdir(path.join(directory,'unpackaged','permissionsets'),{recursive:true});
        await fs.writeFile(path.join(directory,'unpackaged','permissionsets','Sales.permissionset'),'<PermissionSet/>');
        await fs.writeFile(path.join(directory,'unpackaged','package.xml'),'<Package/>');
    }};
    const service=new MetadataService(cli);
    const definition={type:'PermissionSet',suffix:'.permissionset'};
    assert.deepEqual(await Promise.all([service.xml('org',definition,'Sales'),service.xml('org',definition,'Sales')]),['<PermissionSet/>','<PermissionSet/>']);
    assert.equal(calls,1); await assert.rejects(fs.stat(temp),{code:'ENOENT'});
    await assert.rejects(service.xml('org',definition,'Missing'),/No PermissionSet XML/);
    service.clear();await service.xml('org',definition,'Sales');assert.equal(calls,3);
    service.dispose();
});
test('failed remote retrieval cleans up and is retryable',async()=>{
    let temp,count=0;
    const service=new MetadataService({retrieveMetadataFormat:async(org,type,name,cwd,directory)=>{
        temp=directory;count++;throw new Error('CLI failed');
    }});
    await assert.rejects(service.remoteFiles('org','Flow','Test'),/CLI failed/);
    await assert.rejects(fs.stat(temp),{code:'ENOENT'});
    await assert.rejects(service.remoteFiles('org','Flow','Test'),/CLI failed/);assert.equal(count,2);
    service.dispose();
});
