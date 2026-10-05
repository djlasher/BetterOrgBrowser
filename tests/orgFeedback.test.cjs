const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const originalLoad=Module._load;
const handlers=new Map(),statuses=[],trees=[],notifications=[];
let cancel=false;
class EventEmitter {
    listeners=[];
    event=listener=>{this.listeners.push(listener);return{dispose:()=>{this.listeners=this.listeners.filter(l=>l!==listener);}};};
    fire(value){for(const listener of this.listeners)listener(value);}
    dispose(){this.listeners=[];}
}
const vscode={
    EventEmitter,TreeItem:class{},ThemeIcon:class{},TreeItemCollapsibleState:{None:0,Collapsed:1},StatusBarAlignment:{Left:1},ProgressLocation:{Notification:15},
    commands:{registerCommand:(name,fn)=>{handlers.set(name,fn);return{dispose(){}};}},
    workspace:{registerTextDocumentContentProvider:()=>({dispose(){}})},
    window:{
        createOutputChannel:()=>({appendLine(){},show(){},dispose(){}}),
        createTreeView:()=>{const view={dispose(){}};trees.push(view);return view;},
        createStatusBarItem:()=>{const item={show(){this.visible=true;},dispose(){}};statuses.push(item);return item;},
        withProgress:async(_,fn)=>fn(),showQuickPick:async items=>cancel?undefined:items[0],
        showInformationMessage:message=>{notifications.push(message);return new Promise(()=>{});},
        showErrorMessage:message=>{throw new Error(message);}
    }
};
Module._load=function(name,...args){return name==='vscode'?vscode:originalLoad.call(this,name,...args);};
const {activate}=require('../out/extension');
Module._load=originalLoad;
test('welcome, selection confirmation, persistent org feedback, cancellation and restored selection',async()=>{
    const stored=new Map();
    const makeContext=()=>({subscriptions:[],workspaceState:{get:(key,fallback)=>stored.get(key)??fallback,update:async(key,value)=>stored.set(key,value)}});
    const context=makeContext();const {provider}=activate(context);
    const tree=trees.at(-1),status=statuses.at(-1);
    assert.deepEqual(await provider.getChildren(),[]);
    assert.equal(tree.message,undefined);assert.match(status.text,/Select Salesforce Org/);
    assert.equal(status.command,'betterOrgBrowser.selectOrg');assert.equal(status.visible,true);
    assert.match(require('../package.json').contributes.viewsWelcome[0].contents,/\[Select Salesforce Org\]\(command:betterOrgBrowser.selectOrg\)/);
    provider.service.cli.listAuthorizedOrgs=async()=>[{alias:'QA',username:'qa@example.test'}];
    const result=await Promise.race([handlers.get('betterOrgBrowser.selectOrg')().then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),100))]);
    assert.equal(result,true,'does not wait for notification dismissal');
    assert.equal(provider.selectedOrgTarget,'QA');
    assert.equal(tree.message,'Selected org: QA (qa@example.test)');
    assert.match(status.text,/Org: QA/);assert.match(status.tooltip,/qa@example.test/);
    assert.deepEqual(notifications,['Salesforce org selected: QA (qa@example.test)']);
    cancel=true;await handlers.get('betterOrgBrowser.selectOrg')();
    assert.equal(provider.selectedOrgTarget,'QA');assert.equal(notifications.length,1);
    for(const disposable of context.subscriptions)disposable.dispose();
    const restored=makeContext();activate(restored);
    assert.equal(trees.at(-1).message,'Selected org: QA (qa@example.test)');
    assert.match(statuses.at(-1).text,/Org: QA/);
    assert.equal(notifications.length,1,'restoration does not emit a selection notification');
    for(const disposable of restored.subscriptions)disposable.dispose();
});
