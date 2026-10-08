const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const original=Module._load;
const statuses=[],logs=[];
const vscode={StatusBarAlignment:{Left:1},window:{
    createStatusBarItem:()=>{const item={show(){this.visible=true;},dispose(){}};statuses.push(item);return item;},
    createOutputChannel:()=>({appendLine:line=>logs.push(line),show(){},dispose(){}})
}};
Module._load=function(name,...args){return name==='vscode'?vscode:original.call(this,name,...args);};
const {RetrievalFeedback}=require('../out/commands/retrievalFeedback');
Module._load=original;
test('feedback is immediate, stays busy across overlapping operations, and persists completion and failures',async()=>{
    const context={tree:{},provider:{selectedOrgName:'QA Org',selectedOrgTarget:'qa'}};
    const feedback=new RetrievalFeedback(context);
    let doneFirst,doneSecond;
    const first=feedback.run('panel',()=>new Promise(resolve=>{doneFirst=resolve;}));
    const status=statuses.at(-1);
    assert.equal(status.visible,true);assert.match(status.text,/sync~spin/);
    assert.match(context.tree.message,/Selected org: QA Org\nRetrieving: panel/);
    const second=feedback.run('Account.Field__c',()=>new Promise(resolve=>{doneSecond=resolve;}));
    assert.match(context.tree.message,/2 operations/);
    doneFirst();await first;
    assert.match(status.text,/sync~spin/);assert.match(context.tree.message,/Retrieving: Account.Field__c/);
    doneSecond();await second;
    assert.match(status.text,/\$\(check\)/);assert.match(context.tree.message,/Completed: Account.Field__c/);
    await assert.rejects(feedback.run('Broken',()=>{throw new Error('network failed');}),/network failed/);
    assert.match(status.text,/\$\(error\)/);assert.match(context.tree.message,/Failed: Broken.*network failed/);
    await feedback.run('Fast cached file',()=>{});
    assert.match(context.tree.message,/Completed: Fast cached file/);assert.doesNotMatch(status.text,/sync~spin/);
    assert.ok(logs.some(line=>line.includes('START panel')));assert.ok(logs.some(line=>line.includes('network failed')));
    assert.equal(status.command,'betterOrgBrowser.showRetrievalActivity');
    feedback.dispose();
});
