const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const Module=require('node:module');
const {pathToFileURL}=require('node:url');
const original=Module._load;
const uri=file=>({fsPath:path.resolve(file),path:path.resolve(file).replace(/\\/g,'/'),toString(){return pathToFileURL(this.fsPath).toString();}});
let picks=0,cancel=false;
const vscode={Uri:{file:uri,joinPath:(base,...parts)=>uri(path.join(base.fsPath,...parts))},
    RelativePattern:class{constructor(base,pattern){this.base=typeof base==='string'?base:base.fsPath;this.pattern=pattern;}},
    workspace:{workspaceFolders:[],fs:{stat:u=>fs.stat(u.fsPath),readFile:u=>fs.readFile(u.fsPath)},
        createFileSystemWatcher:()=>({dispose(){},onDidCreate:()=>({dispose(){}}),onDidChange:()=>({dispose(){}}),onDidDelete:()=>({dispose(){}})}),
        findFiles:async pattern=>{
            const result=[];
            const walk=async dir=>{for(const item of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){
                if(['node_modules','.git','.sf','.sfdx'].includes(item.name))continue;
                const file=path.join(dir,item.name);
                if(item.isDirectory())await walk(file);else if(pattern.pattern==='**/*'||item.name==='sfdx-project.json')result.push(uri(file));
            }};await walk(pattern.base);return result;
        }},
    window:{showQuickPick:async items=>{picks++;return cancel?undefined:items.at(-1);}}
};
Module._load=function(name,...args){return name==='vscode'?vscode:original.call(this,name,...args);};
const {discoverProjects,projectRoot,clearProjectSelection}=require('../out/workspace/project');
const {LocalMetadata}=require('../out/workspace/localMetadata');
Module._load=original;
async function write(root,file,content=''){const full=path.join(root,file);await fs.mkdir(path.dirname(full),{recursive:true});await fs.writeFile(full,content);}
test('discovers nested and containing projects, deduplicates, and selects among multiple projects',async()=>{
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bob-discovery-'));
    try{
        clearProjectSelection();picks=0;cancel=false;
        const one=path.join(temp,'nested','one');
        await write(one,'sfdx-project.json','{}');await write(one,'force-app/placeholder');
        await write(temp,'node_modules/ignored/sfdx-project.json','{}');
        vscode.workspace.workspaceFolders=[{uri:uri(temp)}];
        assert.equal((await projectRoot()).fsPath,one);assert.equal(picks,0);
        vscode.workspace.workspaceFolders=[{uri:uri(path.join(one,'force-app'))},{uri:uri(one)}];
        assert.equal((await discoverProjects()).length,1);assert.equal((await projectRoot()).fsPath,one);
        vscode.workspace.workspaceFolders=[{uri:uri(temp)}];
        const two=path.join(temp,'nested','two');await write(two,'sfdx-project.json','{}');
        assert.equal(await projectRoot(false),undefined);assert.equal(picks,0);
        assert.equal((await projectRoot()).fsPath,two);assert.equal(picks,1);
        assert.equal((await projectRoot()).fsPath,two);assert.equal(picks,1);
        await fs.unlink(path.join(two,'sfdx-project.json'));
        assert.equal((await projectRoot()).fsPath,one);
        await write(two,'sfdx-project.json','{}');clearProjectSelection();cancel=true;
        await assert.rejects(projectRoot(),/cancelled/);
    }finally{clearProjectSelection();cancel=false;await fs.rm(temp,{recursive:true,force:true});}
});
test('local presence uses configured packages and actual matching files or embedded entries',async()=>{
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bob-local-'));
    const local=new LocalMetadata(()=>{});
    try{
        clearProjectSelection();vscode.workspace.workspaceFolders=[{uri:uri(temp)}];
        await write(temp,'nested/sfdx-project.json',JSON.stringify({packageDirectories:[{path:'custom-source'}]}));
        const root=path.join(temp,'nested');
        await write(root,'custom-source/unusual/objects/Case/fields/Risk__c.field-meta.xml','<CustomField/>');
        await write(root,'custom-source/unusual/lwc/panel/panel.js-meta.xml','<LightningComponentBundle/>');
        await write(root,'custom-source/unusual/permissionsets/Sales.permissionset-meta.xml','<PermissionSet><fieldPermissions><field>Case.Risk__c</field><readable>false</readable></fieldPermissions></PermissionSet>');
        await write(root,'custom-source/unusual/labels/CustomLabels.labels-meta.xml','<CustomLabels><labels><fullName>Greeting</fullName><value>Hello</value></labels></CustomLabels>');
        await write(root,'outside-package/classes/Hidden.cls','class Hidden{}');
        const node=(type,member)=>({data:{manifest:{type,member}}});
        assert.equal((await local.state(node('CustomField','Case.Risk__c'))).present,true);
        assert.equal((await local.state(node('CustomObject','Case'))).present,false);
        assert.equal((await local.state(node('ApexClass','Hidden'))).present,false);
        assert.equal((await local.state(node('LightningComponentBundle','panel'))).present,true);
        assert.equal((await local.state(node('CustomLabel','Greeting'))).present,true);
        assert.equal((await local.state(node('CustomLabel','Missing'))).present,false);
        const owner={name:'Sales',definition:{type:'PermissionSet',suffix:'.permissionset'}};
        const entry=name=>({parent:owner,data:{sync:{section:'fieldPermissions',key:'field',name}}});
        assert.equal((await local.state(entry('Case.Risk__c'))).present,true);
        assert.equal((await local.state(entry('Case.Other__c'))).present,false);
        await fs.unlink(path.join(root,'custom-source/unusual/objects/Case/fields/Risk__c.field-meta.xml'));local.invalidate();
        assert.equal((await local.state(node('CustomField','Case.Risk__c'))).present,false);
        assert.equal(await local.state({data:{},kind:'section'}),undefined);
    }finally{local.dispose();await fs.rm(temp,{recursive:true,force:true});}
});
