const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
const vscode = {
    TreeItem: class { constructor(label, collapsibleState) { this.label=label; this.collapsibleState=collapsibleState; } },
    TreeItemCollapsibleState: {None:0, Collapsed:1, Expanded:2},
    ThemeIcon: class { constructor(id) {this.id=id;} },
    EventEmitter: class { event=()=>({dispose(){}}); fire(){} dispose(){} },
    window: { withProgress: async (_,load)=>load() }
};
Module._load = function(name,...args) { return name==='vscode'?vscode:originalLoad.call(this,name,...args); };
const { MetadataProvider } = require('../out/metadata/metadataProvider');
Module._load = originalLoad;
function service(overrides={}) {
    return {clear(){},list:async()=>[{fullName:'Account'}],describe:async()=>[{name:'Name',type:'string'}],
        xml:async()=>'<CustomObject><fields><fullName>Name</fullName></fields><validationRules><fullName>Require_Name</fullName></validationRules></CustomObject>',...overrides};
}
async function root(provider,type) { return (await provider.getChildren()).find(n=>n.definition?.type===type); }
test('tree startup is lazy and custom object children have valid parents and members',async()=>{
    let count=0;
    const provider=new MetadataProvider(service({list:async()=>{count++;return [{fullName:'Account'}];}}));
    provider.setSelectedOrg('Test','test');
    const objects=await root(provider,'CustomObject'); assert.equal(count,0);
    const account=(await provider.getChildren(objects))[0]; assert.equal(count,1);
    await provider.getChildren(objects); assert.equal(count,1);
    const sections=await provider.getChildren(account);
    const rule=(await provider.getChildren(sections.find(n=>n.label==='Validation Rules')))[0];
    assert.deepEqual(rule.data.manifest,{type:'ValidationRule',member:'Account.Require_Name'});
    const fields=sections.find(n=>n.label==='Fields');
    const field=(await provider.getChildren(fields))[0];
    assert.equal(provider.getParent(field),fields); assert.match(field.contextValue,/:field/);
    assert.equal(field.data.manifest.member,'Account.Name');
});
test('object XML failure leaves describe fields available',async()=>{
    const provider=new MetadataProvider(service({xml:async()=>{throw new Error('access denied');}}));
    provider.setSelectedOrg('Test','test');
    const account=(await provider.getChildren(await root(provider,'CustomObject')))[0];
    const children=await provider.getChildren(account);
    assert.equal(children[1].kind,'Error'); assert.equal((await provider.getChildren(children[0]))[0].name,'Name');
});
test('folder-aware listing retains the folder parent for reveal',async()=>{
    const calls=[];
    const provider=new MetadataProvider(service({list:async(org,type,folder)=>{calls.push([type,folder]);return [{fullName:folder?'Sales/Pipeline':'Sales'}];}}));
    provider.setSelectedOrg('Test','test');
    const reports=await root(provider,'Report');
    const folder=(await provider.getChildren(reports))[0];
    const report=(await provider.getChildren(folder))[0];
    assert.equal(provider.getParent(report),folder);
    assert.deepEqual(calls,[['ReportFolder',undefined],['Report','Sales']]);
    assert.deepEqual(report.data.manifest,{type:'Report',member:'Sales/Pipeline'});
});
test('bundle files remain inspectable without invalid manifest or sync capabilities',async()=>{
    const provider=new MetadataProvider(service({list:async()=>[{fullName:'panel'}],remoteFiles:async()=>[
        {path:'unpackaged/lwc/panel/panel.js',content:'export default class Panel {}'},
        {path:'unpackaged/lwc/panel/__tests__/panel.test.js',content:'test'},
        {path:'unpackaged/lwc/other/other.js',content:'ignore'}]}));
    provider.setSelectedOrg('Test','test');
    const bundle=(await provider.getChildren(await root(provider,'LightningComponentBundle')))[0];
    const files=await provider.getChildren(bundle);
    assert.equal(files.length,2); assert.equal(files[1].label,'__tests__/panel.test.js');
    assert.equal(files[0].data.manifest,undefined); assert.equal(files[0].data.sync,undefined);
    assert.match(files[0].remoteContent,/Panel/);
});
test('late previous-org loads are discarded and failed metadata roots remain retryable',async()=>{
    let resolve;
    const provider=new MetadataProvider(service({list:()=>new Promise(r=>{resolve=r;})}));
    provider.setSelectedOrg('Old','old');
    const pending=provider.getChildren(await root(provider,'ApexClass')); await Promise.resolve();
    provider.setSelectedOrg('New','new'); resolve([{fullName:'OldClass'}]); assert.deepEqual(await pending,[]);
    let fail=true;
    provider.service.list=async()=>{if(fail)throw new Error('temporary');return [{fullName:'NewClass'}];};
    const classes=await root(provider,'ApexClass'); assert.equal((await provider.getChildren(classes))[0].kind,'Error');
    fail=false; assert.equal((await provider.getChildren(classes))[0].name,'NewClass');
});
test('Custom Labels retrieve the aggregate and produce valid child members',async()=>{
    const provider=new MetadataProvider(service({list:async()=>{throw new Error('must not list CustomLabel');},
        xml:async()=>'<CustomLabels><labels><fullName>Greeting</fullName><value>Hello</value></labels></CustomLabels>'}));
    provider.setSelectedOrg('Test','test');
    const label=(await provider.getChildren(await root(provider,'CustomLabels')))[0];
    assert.deepEqual(label.data.manifest,{type:'CustomLabel',member:'Greeting'});
});
test('metadata-only fields survive describe failure and standard fields retain download actions',async()=>{
    const provider=new MetadataProvider(service({describe:async()=>{throw new Error('describe unavailable');}}));
    provider.setSelectedOrg('Test','test');
    const account=(await provider.getChildren(await root(provider,'CustomObject')))[0];
    const fields=(await provider.getChildren(account)).find(node=>node.label==='Fields');
    const children=await provider.getChildren(fields);
    assert.equal(children[0].name,'Name');assert.match(children[0].contextValue,/:download/);
    assert.deepEqual(children[0].data.objectField,{object:'Account',field:'Name'});
});
test('Flows, Layouts, and Lightning Pages retain all children but only parents offer retrieval',async()=>{
    for(const [type,xml] of [
        ['Flow','<Flow><screens><name>Main</name><fields><name>Input</name></fields></screens><start><label>Start</label></start></Flow>'],
        ['Layout','<Layout><layoutSections><label>Details</label><layoutColumns><layoutItems><field>Name</field></layoutItems></layoutColumns></layoutSections></Layout>'],
        ['FlexiPage','<FlexiPage><flexiPageRegions><name>main</name><itemInstances><componentInstance><identifier>panel</identifier><componentName>c:panel</componentName></componentInstance></itemInstances></flexiPageRegions></FlexiPage>']
    ]){
        const provider=new MetadataProvider(service({list:async()=>[{fullName:'Example'}],xml:async()=>xml}));
        provider.setSelectedOrg('Test','test');
        const parent=(await provider.getChildren(await root(provider,type)))[0];
        assert.match(parent.contextValue,/:manifest/);
        const descendants=await provider.getChildren(parent);
        assert.ok(descendants.length);
        let count=0;
        const walk=nodes=>{for(const node of nodes){
            count++;assert.equal(node.canRetrieveChild,false);assert.doesNotMatch(node.contextValue,/:download/);
            assert.match(node.tooltip,/Browse \/ inspect only/);
            if(node.children)walk(node.children);
        }};
        walk(descendants);assert.ok(count>=2);
    }
});
